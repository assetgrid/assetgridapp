import * as React from "react";
import { Api, useApi } from "../../../lib/ApiClient";
import { Transaction } from "../../../models/transaction";
import Modal from "../../common/Modal";
import InputButton from "../../input/InputButton";

interface Props {
    close: () => void;
    deleted: () => void;
    transaction: Transaction;
}

export default function DeleteTransactionModal(props: Props) {
    const [isDeleting, setisDeleting] = React.useState(false);
    const api = useApi();

    return <Modal
        active={true}
        title={"Delete transaction"}
        close={() => props.close()}
        footer={<>
            {<InputButton onClick={() => deleteTransaction()} disabled={isDeleting || api === null} className="is-danger">Delete transaction</InputButton>}
            <button className="button" onClick={() => props.close()}>Cancel</button>
        </>}>
        <p>Are you sure you want to delete transaction "#{props.transaction.id} {props.transaction.description}"? This action is irreversible!</p>
    </Modal>;

    async function deleteTransaction() {
        if (api === null) return;

        setisDeleting(true);
        await api.Transaction.delete(props.transaction.id);
        props.deleted();
    }
}