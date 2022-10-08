import * as React from "react";
import { useApi } from "../../../lib/ApiClient";
import { forget } from "../../../lib/Utils";
import { Account, CreateAccount as CreateAccountModel } from "../../../models/account";
import { userContext } from "../../App";
import Modal from "../../common/Modal";
import InputModifyAccount from "./InputModifyAccount";

interface Props {
    close: () => void
    closeOnChange?: boolean
    created: (account: Account) => void
    preset: CreateAccountModel
}

export default function CreateAccountModal (props: Props): React.ReactElement {
    const [model, setModel] = React.useState(props.preset);
    const [isCreating, setIsCreating] = React.useState(false);
    const { user, updateFavoriteAccounts } = React.useContext(userContext);
    const [errors, setErrors] = React.useState<{ [key: string]: string[] }>({});
    const api = useApi();

    return <Modal
        active={true}
        title={"Create account"}
        close={() => props.close()}
        footer={<>
            <button className="button is-success" onClick={forget(create)} disabled={isCreating || api === null}>Create account</button>
            <button className="button" onClick={() => props.close()}>Cancel</button>
        </>}>
        <InputModifyAccount
            errors={errors}
            value={model}
            disabled={isCreating}
            onChange={account => setModel(account)} />
    </Modal>;

    async function create (): Promise<void> {
        if (api === null) return;

        setIsCreating(true);
        setErrors({});
        const result = await api.Account.create(model);
        setModel(props.preset);
        setIsCreating(false);
        if (result.status === 200) {
            if (result.data.favorite) {
                if (user !== "fetching") {
                    updateFavoriteAccounts([...user.favoriteAccounts, result.data]);
                }
            }
            props.created(result.data);
            if (props.closeOnChange !== undefined) {
                props.close();
            }
        } else if (result.status === 400) {
            setErrors(result.errors);
        }
    }
}
