import * as React from "react";
import { useTranslation } from "react-i18next";
import { CreateAccount } from "../../../models/account";
import InputCheckbox from "../../input/InputCheckbox";
import InputText from "../../input/InputText";
import InputTextMultiple from "../../input/InputTextMultiple";

interface Props {
    value: CreateAccount
    disabled: boolean
    onChange: (account: CreateAccount) => void
    errors: { [key: string]: string[] }
}

export default function InputCreateAccount (props: Props): React.ReactElement {
    const { t } = useTranslation();
    return <>
        <InputText label={t("account.name")!}
            value={props.value.name}
            onChange={e => props.onChange({ ...props.value, name: e.target.value })}
            errors={props.errors.Name}
            disabled={props.disabled} />
        <InputText label={t("account.description")!}
            value={props.value.description}
            onChange={e => props.onChange({ ...props.value, description: e.target.value })}
            errors={props.errors.Description}
            disabled={props.disabled} />
        <InputTextMultiple label={t("account.identifiers")!}
            value={props.value.identifiers}
            onChange={value => props.onChange({ ...props.value, identifiers: value })}
            errors={props.errors.Identifiers}
            disabled={props.disabled} />
        <InputCheckbox label={t("account.favorite")!}
            value={props.value.favorite}
            onChange={e => props.onChange({ ...props.value, favorite: e.target.checked })}
            errors={props.errors.Favorite}
            disabled={props.disabled} />
        <InputCheckbox label={t("account.include_in_net_worth")!}
            value={props.value.includeInNetWorth}
            onChange={e => props.onChange({ ...props.value, includeInNetWorth: e.target.checked })}
            errors={props.errors.IncludeInNetWorth}
            disabled={props.disabled} />
    </>;
}
