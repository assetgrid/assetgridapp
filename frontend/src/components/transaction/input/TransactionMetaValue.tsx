import { FieldValueType } from "../../../models/meta";
import * as React from "react";
import { MetaFieldType } from "./TransactionMetaInput";
import YesNoDisplay from "../../input/YesNoDisplay";
import { userContext } from "../../App";
import { formatNumberWithUser } from "../../../lib/Utils";
import AccountLink from "../../account/AccountLink";
import TransactionLink from "../TransactionLink";
import { useTranslation } from "react-i18next";

interface Props {
    field: MetaFieldType
};

export default function TransactionMetaValue (props: Props): React.ReactElement {
    const { user } = React.useContext(userContext);
    const { t } = useTranslation();

    switch (props.field.type) {
        case FieldValueType.TextLine:
            return props.field.value === null
                ? <span>{t("common.no_value")}</span>
                : <span>{props.field.value}</span>;
        case FieldValueType.TextLong:
            return props.field.value === null
                ? <span>{t("common.no_value")}</span>
                : <pre className="multiline-text">{props.field.value}</pre>;
        case FieldValueType.Number:
            return props.field.value === null
                ? <span>{t("common.no_value")}</span>
                : <span>{formatNumberWithUser(props.field.value, user)}</span>;
        case FieldValueType.Boolean:
            return props.field.value === null
                ? <YesNoDisplay value={false} />
                : <YesNoDisplay value={props.field.value} />;
        case FieldValueType.Account:
            return props.field.value === null
                ? <span>{t("common.no_value")}</span>
                : <AccountLink account={props.field.value} />;
        case FieldValueType.Transaction:
            return props.field.value === null
                ? <span>{t("common.no_value")}</span>
                : <TransactionLink transaction={props.field.value} />;
        default:
            throw new Error("Not implemented");
    }
}
