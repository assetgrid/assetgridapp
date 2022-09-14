import * as React from "react";
import { Api } from "../../../lib/ApiClient";
import { Account } from "../../../models/account";
import { Preferences } from "../../../models/preferences";
import { SearchGroup, SearchGroupType, SearchOperator } from "../../../models/search";
import Modal from "../../common/Modal";
import TransactionList from "../../transaction/TransactionList";
import InputButton from "../InputButton";

interface Props {
    close: () => void;
    deleted: () => void;
    account: Account;
    preferences: Preferences | "fetching";
}

export default function DeleteAccountModal(props: Props) {
    const [isDeleting, setisDeleting] = React.useState(false);

    /* Query returning transactions that reference this account and no other account*/
    const query: SearchGroup = {
        type: SearchGroupType.Or,
        children: [ {
            type: SearchGroupType.And,
            children: [
                {
                    type: SearchGroupType.Query,
                    query: {
                        column: "SourceAccountId",
                        value: null,
                        operator: SearchOperator.Equals,
                        not: false
                    }
                },
                {
                    type: SearchGroupType.Query,
                    query: {
                        column: "DestinationAccountId",
                        value: props.account.id,
                        operator: SearchOperator.Equals,
                        not: false
                    }
                }
            ]
        }, {
            type: SearchGroupType.And,
            children: [
                {
                    type: SearchGroupType.Query,
                    query: {
                        column: "SourceAccountId",
                        value: props.account.id,
                        operator: SearchOperator.Equals,
                        not: false
                    }
                },
                {
                    type: SearchGroupType.Query,
                    query: {
                        column: "DestinationAccountId",
                        value: null,
                        operator: SearchOperator.Equals,
                        not: false
                    }
                }
            ]
        }]
    };

    return <Modal
        active={true}
        title={"Delete account"}
        close={() => props.close()}
        footer={<>
            {props.deleted && <InputButton onClick={() => deleteAccount()} disabled={isDeleting} className="is-danger">Delete account</InputButton>}
            <button className="button" onClick={() => props.close()}>Cancel</button>
        </>}>
        <p>Are you sure you want to delete this account? This action is irreversible!</p>
        <p>Transactions that do not have a source or destination after the deletion of this account will be deleted as well.</p>
        <p>The following transactions will be deleted:</p>
        <TransactionList allowEditing={false} allowLinks={false} query={query} small={true} pageSize={5} />
    </Modal>;

    async function deleteAccount() {
        setisDeleting(true);
        await Api.Account.delete(props.account.id);
        props.deleted();
    }
}