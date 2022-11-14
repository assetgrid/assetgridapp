import { FieldValueType } from "../../../models/meta";
import * as React from "react";
import InputTextOrNull from "../../input/InputTextOrNull";
import InputNumber from "../../input/InputNumber";
import Decimal from "decimal.js";
import InputCheckbox from "../../input/InputCheckbox";
import { Transaction } from "../../../models/transaction";
import { Account } from "../../../models/account";
import InputAccount from "../../account/input/InputAccount";
import InputTextArea from "../../input/InputTextArea";
import InputTransaction from "./InputTransaction";
import { useTranslation } from "react-i18next";

interface Props {
    disabled: boolean
    errors?: string[]
    onChange: (value: string | Decimal | boolean | Account | Transaction | null) => void
    field: MetaFieldType
};

export type MetaFieldType = {
    type: FieldValueType.TextLine | FieldValueType.TextLong
    value: string | null
} | {
    type: FieldValueType.Number
    value: Decimal | null
} | {
    type: FieldValueType.Boolean
    value: boolean
} | {
    type: FieldValueType.Account
    value: Account
} | {
    type: FieldValueType.Transaction
    value: Transaction
} | {
    type: FieldValueType.Attachment
    value: string
};

export default function TransactionMetaInput (props: Props): React.ReactElement {
    const { t } = useTranslation();

    switch (props.field.type) {
        case FieldValueType.TextLine:
            return <InputTextOrNull value={props.field.value}
                noValueText={t("common.no_value")}
                onChange={value => props.onChange(value)}
                disabled={props.disabled}
                errors={props.errors}
            />;
        case FieldValueType.TextLong:
            return <InputTextArea value={props.field.value}
                allowNull={true}
                noValueText={t("common.no_value")}
                onChange={value => props.onChange(value)}
                disabled={props.disabled}
                errors={props.errors}
            />;
        case FieldValueType.Number:
            return <InputNumber
                value={props.field.value}
                noValueText={t("common.no_value")}
                allowNull={true}
                onChange={value => props.onChange(value)}
                disabled={props.disabled}
                errors={props.errors}
            />;
        case FieldValueType.Boolean:
            return <InputCheckbox
                value={props.field.value}
                onChange={e => props.onChange(e.target.checked)}
                disabled={props.disabled}
                errors={props.errors}
            />;
        case FieldValueType.Account:
            return <InputAccount
                value={props.field.value}
                allowNull={true}
                nullSelectedText={t("common.no_value")!}
                onChange={value => props.onChange(value)}
                disabled={props.disabled}
                errors={props.errors}
                allowCreateNewAccount={true}
            />;
        case FieldValueType.Transaction:
            return <InputTransaction
                value={props.field.value}
                allowNull={true}
                nullSelectedText={t("common.no_value")!}
                onChange={value => props.onChange(value)}
                disabled={props.disabled}
                errors={props.errors}
            />;
        default:
            throw new Error("Not implemented");
    }
}
