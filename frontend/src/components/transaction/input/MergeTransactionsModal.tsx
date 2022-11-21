import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useApi } from "../../../lib/ApiClient";
import { forget } from "../../../lib/Utils";
import { SearchGroup, SearchGroupType, SearchOperator } from "../../../models/search";
import Modal from "../../common/Modal";
import InputButton from "../../input/InputButton";
import TransactionList from "../table/TransactionList";

interface Props {
    close: () => void
    merged: () => void
    transactions: Set<number>
    active: boolean
}

export default function MergeTransactionsModal (props: Props): React.ReactElement {
    const [isMerging, setIsMerging] = React.useState(false);
    const api = useApi();
    const [selectedTransactionId, setSelectedTransactionId] = React.useState<number | null>(null);
    const [draw, setDraw] = React.useState(0);
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    const query: SearchGroup = React.useMemo(() => ({
        type: SearchGroupType.Query,
        query: {
            column: "Id",
            operator: SearchOperator.In,
            value: [...props.transactions],
            not: false,
            metaData: false
        }
    }), [props.active, props.transactions]);

    React.useEffect(() => {
        if (props.active) {
            setDraw(draw => draw + 1);
        }
    }, [props.active, props.transactions]);

    return <Modal
        active={props.active}
        title={t("transaction.merge_transactions")}
        close={() => props.close()}
        footer={<>
            {<InputButton onClick={forget(mergeTransactions)}
                disabled={isMerging || api === null || selectedTransactionId === null}
                className="is-primary">
                {t("transaction.merge_transactions")}
            </InputButton>}
            <button className="button" onClick={() => props.close()}>{t("common.cancel")}</button>
        </>}>
        <p>{t("transaction.merge_confirm_and_information")}</p>
        <p>{t("transaction.merge_chose_which_to_keep")}</p>
        {props.active && <TransactionList
            allowLinks={false}
            allowEditing={false}
            pageSize={5}
            query={query}
            draw={draw}
            selectedTransaction={[selectedTransactionId, setSelectedTransactionId]}
        />}
    </Modal>;

    async function mergeTransactions (): Promise<void> {
        if (api === null || selectedTransactionId == null) return;

        setIsMerging(true);
        const transactions = await api.Transaction.search({ from: 0, to: 2000, query, descending: false, orderByColumn: "Id" });
        const selectedTransaction = transactions.data.find(x => x.id === selectedTransactionId);
        if (selectedTransaction === undefined) return;

        await api.Transaction.update(selectedTransactionId, {
            identifiers: [...transactions.data.flatMap(t => t.identifiers)],
            dateTime: selectedTransaction.dateTime,
            description: selectedTransaction.description,
            destinationId: selectedTransaction.destination?.id ?? null,
            isSplit: selectedTransaction.isSplit,
            lines: selectedTransaction.lines,
            sourceId: selectedTransaction.source?.id ?? null,
            total: selectedTransaction.total,
            metaData: null
        });
        await api.Transaction.deleteMultiple({
            type: SearchGroupType.And,
            children: [
                query, {
                    type: SearchGroupType.Query,
                    query: {
                        column: "Id",
                        value: selectedTransactionId,
                        not: true,
                        operator: SearchOperator.Equals,
                        metaData: false
                    }
                }
            ]
        });
        setIsMerging(false);
        props.merged();

        await queryClient.invalidateQueries(["transaction"]);
        for (const transaction of transactions.data) {
            await queryClient.invalidateQueries(["transaction", transaction.id]);
            if (transaction.source !== null) {
                await queryClient.invalidateQueries(["account", transaction.source.id, "transactions"]);
            }
            if (transaction.destination !== null) {
                await queryClient.invalidateQueries(["account", transaction.destination.id, "transactions"]);
            }
        }
    }
}
