import { faTrashCan } from "@fortawesome/free-solid-svg-icons";
import Decimal from "decimal.js";
import { useTranslation } from "react-i18next";
import { ActionSetLines } from "../../../models/automation/transactionAutomation";
import { TransactionLine } from "../../../models/transaction";
import InputButton from "../../input/InputButton";
import InputCategory from "../../input/InputCategory";
import InputIconButton from "../../input/InputIconButton";
import InputNumber from "../../input/InputNumber";
import InputText from "../../input/InputText";
import { TransactionActionEditorProps, DefaultTransactionEditorLayout } from "./TransactionActionEditor";
import * as React from "react";

export function SetLinesEditor (props: TransactionActionEditorProps<ActionSetLines>): React.ReactElement {
    const { t } = useTranslation();
    if (props.action.value.length === 0) {
        return <DefaultTransactionEditorLayout {...props} description={t("transaction.turn_split_into_non_split")}>
            <p>{t("transaction.will_turn_split_into_non_split")}</p>
            <p>{t("transaction.how_to_set_total_after_split_into_nonsplit")}</p>
            <div className="buttons mb-3 mt-1">
                <InputButton onClick={() => onChange([{ description: t("transaction.transaction_line"), amount: new Decimal(0), category: "" }])}>
                    {t("transaction.add_lines")}
                </InputButton>
            </div>
        </DefaultTransactionEditorLayout>;
    }

    return <DefaultTransactionEditorLayout {...props} description={t("transaction.split_and_set_lines")}>
        <table className="table is-fullwidth">
            <thead>
                <tr>
                    <th>{t("common.description")}</th>
                    <th className="has-text-right">{t("transaction.amount")}</th>
                    <th>{t("common.category")}</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                {props.action.value.map((line, i) => <tr key={i}>
                    <td>
                        <InputText value={line.description}
                            onChange={e => onChange([
                                ...props.action.value.slice(0, i),
                                { ...line, description: e.target.value },
                                ...props.action.value.slice(i + 1)])}
                            disabled={props.disabled}
                        />
                    </td>
                    <td className="has-text-right">
                        <InputNumber value={line.amount}
                            onChange={value => onChange([
                                ...props.action.value.slice(0, i),
                                { ...line, amount: value },
                                ...props.action.value.slice(i + 1)])}
                            allowNull={false}
                            disabled={props.disabled}
                        />
                    </td>
                    <td>
                        <InputCategory value={line.category}
                            onChange={value => onChange([
                                ...props.action.value.slice(0, i),
                                { ...line, category: value },
                                ...props.action.value.slice(i + 1)])}
                            disabled={props.disabled}
                        />
                    </td>
                    <td style={{ verticalAlign: "middle" }}>
                        <InputIconButton icon={faTrashCan} onClick={() => onChange(props.action.value.filter((_, index) => index !== i))} />
                    </td>
                </tr>)}
            </tbody>
        </table>
        <div className="buttons">
            <InputButton disabled={props.disabled}
                onClick={() => onChange([
                    ...props.action.value,
                    {
                        description: t("transaction.transaction_line"),
                        amount: new Decimal(0),
                        category: ""
                    }
                ])}>
                {t("transaction.add_line")}
            </InputButton>
        </div>
    </DefaultTransactionEditorLayout>;

    function onChange (lines: TransactionLine[]): void {
        props.onChange({
            ...props.action,
            value: lines
        });
    }
}
