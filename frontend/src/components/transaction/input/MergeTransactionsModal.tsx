import * as React from "react";
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

    const query: SearchGroup = React.useMemo(() => ({
        type: SearchGroupType.Query,
        query: {
            column: "Id",
            operator: SearchOperator.In,
            value: [...props.transactions],
            not: false
        }
    }), [props.active, props.transactions]);

    React.useEffect(() => {
        if (props.active) {
            setDraw(draw => draw + 1);
        }
    }, [props.active, props.transactions]);

    return <Modal
        active={props.active}
        title={"Merge transactions"}
        close={() => props.close()}
        footer={<>
            {<InputButton onClick={forget(mergeTransactions)} disabled={isMerging || api === null || selectedTransactionId === null} className="is-primary">Merge transactions</InputButton>}
            <button className="button" onClick={() => props.close()}>Cancel</button>
        </>}>
        <p>Do you want to merge the following transactions. Merging will add the identifiers from all transactions to a single one and delete the others.</p>
        <p>Chose which transaction you want to keep:</p>
        <TransactionList
            allowLinks={false}
            allowEditing={false}
            pageSize={5}
            query={query}
            draw={draw}
            selectedTransaction={[selectedTransactionId, setSelectedTransactionId]}
        />
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
                        operator: SearchOperator.Equals
                    }
                }
            ]
        });
        setIsMerging(false);
        props.merged();
    }
}
