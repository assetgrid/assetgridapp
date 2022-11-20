import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useApi } from "../../../lib/ApiClient";
import { forget } from "../../../lib/Utils";
import { Transaction } from "../../../models/transaction";
import Modal from "../../common/Modal";
import InputButton from "../../input/InputButton";

interface Props {
    close: () => void
    deleted?: () => void
    transaction: Transaction
}

export default function DeleteTransactionModal (props: Props): React.ReactElement {
    const [isDeleting, setisDeleting] = React.useState(false);
    const api = useApi();
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    return <Modal
        active={true}
        title={t("common.delete_transaction")}
        close={() => props.close()}
        footer={<>
            {<InputButton onClick={forget(deleteTransaction)} disabled={isDeleting || api === null} className="is-danger">{t("common.delete_transaction")}</InputButton>}
            <button className="button" onClick={() => props.close()}>{t("common.cancel")}</button>
        </>}>
        <p>{t("transaction.confirm_delete_transaction", { transaction: `#${props.transaction.id} ${props.transaction.description}` })}</p>
        <p>{t("common.action_is_irreversible")}</p>
    </Modal>;

    async function deleteTransaction (): Promise<void> {
        if (api === null) return;

        setisDeleting(true);
        await api.Transaction.delete(props.transaction.id);
        props.deleted?.();

        await queryClient.invalidateQueries(["transaction", "list"]);
        await queryClient.invalidateQueries(["transaction", props.transaction.id]);
        if (props.transaction.source !== null) {
            await queryClient.invalidateQueries(["account", props.transaction.source.id, "transactions"]);
        }
        if (props.transaction.destination !== null) {
            await queryClient.invalidateQueries(["account", props.transaction.destination.id, "transactions"]);
        }
    }
}
