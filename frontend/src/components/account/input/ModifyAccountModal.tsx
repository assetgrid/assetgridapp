import * as React from "react";
import { Api } from "../../../lib/ApiClient";
import { Account, CreateAccount as CreateAccountModel } from "../../../models/account";
import Modal from "../../common/Modal";
import InputButton from "../../input/InputButton";
import InputModifyAccount from "./InputModifyAccount";

interface Props {
    close: () => void;
    closeOnChange?: boolean;
    updated: (account: Account) => void;
    account: Account;
}

export default function ModifyAccountModal(props: Props) {
    const [model, setModel] = React.useState(props.account);
    const [isUpdating, setIsUpdating] = React.useState(false);

    return <Modal
        active={true}
        title={"Modify account"}
        close={() => props.close()}
        footer={<>
            <InputButton className="is-success" onClick={() => update()} disabled={isUpdating}>Save changes</InputButton>
            <InputButton onClick={() => props.close()}>Cancel</InputButton>
        </>}>
        <InputModifyAccount value={model} disabled={isUpdating} onChange={account => setModel({
            id: model.id,
            favorite: account.favorite,
            accountNumber: account.accountNumber,
            description: account.description,
            includeInNetWorth: account.includeInNetWorth,
            name: account.name,
        })}/>
    </Modal>;

    async function update() {
        setIsUpdating(true);
        const result = await Api.Account.update(props.account.id, model);
        setModel(result);
        setIsUpdating(false);
        if (props.updated !== undefined) {
            props.updated(result);
        }
        if (props.closeOnChange) {
            props.close();
        }
    }
}