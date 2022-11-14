import * as React from "react";
import { useTranslation } from "react-i18next";
import { useApi } from "../../../lib/ApiClient";
import { forget } from "../../../lib/Utils";
import { Account } from "../../../models/account";
import Modal from "../../common/Modal";
import InputButton from "../../input/InputButton";
import InputModifyAccount from "./InputModifyAccount";

interface Props {
    close: () => void
    closeOnChange?: boolean
    updated: (account: Account) => void
    account: Account
}

export default function ModifyAccountModal (props: Props): React.ReactElement {
    const [model, setModel] = React.useState(props.account);
    const [isUpdating, setIsUpdating] = React.useState(false);
    const [errors, setErrors] = React.useState<{ [key: string]: string[] }>({});
    const api = useApi();
    const { t } = useTranslation();

    return <Modal
        active={true}
        title={t("account.modify_account")}
        close={() => props.close()}
        footer={<>
            <InputButton className="is-success" onClick={forget(update)} disabled={isUpdating || api === null}>{t("common.save_changes")}</InputButton>
            <InputButton onClick={() => props.close()}>{t("common.cancel")}</InputButton>
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
                name: account.name
            })}/>
    </Modal>;

    async function update (): Promise<void> {
        if (api === null) return;

        setIsUpdating(true);
        setErrors({});
        const result = await api.Account.update(props.account.id, model);
        setIsUpdating(false);
        if (result.status === 200) {
            setModel(result.data);
            props.updated(result.data);
            if (props.closeOnChange !== undefined) {
                props.close();
            }
        } else if (result.status === 400) {
            setErrors(result.errors);
        }
    }
}
