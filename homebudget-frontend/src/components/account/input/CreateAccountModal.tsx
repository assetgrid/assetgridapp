import * as React from "react";
import { Api } from "../../../lib/ApiClient";
import { Account, CreateAccount as CreateAccountModel } from "../../../models/account";
import Modal from "../../common/Modal";
import InputModifyAccount from "./InputModifyAccount";

interface Props {
    close: () => void;
    closeOnChange?: boolean;
    created: (account: Account) => void;
    preset: CreateAccountModel;
}

export default function CreateAccountModal(props: Props) {
    const [model, setModel] = React.useState(props.preset);
    const [isCreating, setIsCreating] = React.useState(false);

    return <Modal
        active={true}
        title={"Create account"}
        close={() => props.close()}
        footer={<>
            <button className="button is-success" onClick={() => create()} disabled={isCreating}>Create account</button>
            <button className="button" onClick={() => props.close()}>Cancel</button>
        </>}>
        <InputModifyAccount value={model} disabled={isCreating} onChange={account => setModel(account)}/>
    </Modal>;

    async function create() {
        setIsCreating(true);
        const result = await Api.Account.create(model);
        setModel(props.preset);
        setIsCreating(false);
        if (props.created !== undefined) {
            props.created(result);
        }
        if (props.closeOnChange) {
            props.close();
        }
    }
}