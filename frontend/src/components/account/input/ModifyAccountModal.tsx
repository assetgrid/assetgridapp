import * as React from "react";
import { Api, useApi } from "../../../lib/ApiClient";
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
    const [errors, setErrors] = React.useState<{ [key: string]: string[] }>({});
    const api = useApi();

    return <Modal
        active={true}
        title={"Modify account"}
        close={() => props.close()}
        footer={<>
            <InputButton className="is-success" onClick={() => update()} disabled={isUpdating || api === null}>Save changes</InputButton>
            <InputButton onClick={() => props.close()}>Cancel</InputButton>
        </>}>
        <InputModifyAccount
            value={model}
            disabled={isUpdating}
            errors={errors}
            onChange={account => setModel({
                id: model.id,
                favorite: account.favorite,
                identifiers: account.identifiers,
                description: account.description,
                includeInNetWorth: account.includeInNetWorth,
                name: account.name,
            })}/>
    </Modal>;

    async function update() {
        if (api === null) return;

        setIsUpdating(true);
        setErrors({});
        const result = await api.Account.update(props.account.id, model);
        setIsUpdating(false);
        if (result.status === 200) {
            setModel(result.data);
            if (props.updated !== undefined) {
                props.updated(result.data);
            }
            if (props.closeOnChange) {
                props.close();
            }
        } else if (result.status === 400) {
            setErrors(result.errors);
        }
    }
}