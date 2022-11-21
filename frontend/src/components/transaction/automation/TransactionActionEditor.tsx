import { faTrashCan } from "@fortawesome/free-regular-svg-icons";
import { useQuery } from "@tanstack/react-query";
import Decimal from "decimal.js";
import { DateTime } from "luxon";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useApi } from "../../../lib/ApiClient";
import { formatDateTimeWithUser, formatNumberWithUser } from "../../../lib/Utils";
import { Account } from "../../../models/account";
import {
    ActionDelete,
    ActionSetAccount,
    ActionSetAmount, ActionSetCategory, ActionSetDescription, ActionSetLines, ActionSetTimestmap, TransactionAction
} from "../../../models/automation/transactionAutomation";
import { TransactionLine } from "../../../models/transaction";
import InputAccount from "../../account/input/InputAccount";
import { useUser } from "../../App";
import InputButton from "../../input/InputButton";
import InputCategory from "../../input/InputCategory";
import InputDateTime from "../../input/InputDateTime";
import InputIconButton from "../../input/InputIconButton";
import InputNumber from "../../input/InputNumber";
import InputSelect from "../../input/InputSelect";
import InputText from "../../input/InputText";

interface Props<T> {
    action: T
    onChange: (action: TransactionAction) => void
    disabled: boolean
    delete?: () => void
}
export default function TransactionActionEditor (props: Props<TransactionAction>): React.ReactElement {
    switch (props.action.key) {
        case "set-description":
            return <SetDescriptionEditor {...props} action={props.action} onChange={props.onChange} />;
        case "set-timestamp":
            return <SetTimestampEditor {...props} action={props.action} onChange={props.onChange} />;
        case "set-amount":
            return <SetAmountEditor {...props} action={props.action} onChange={props.onChange} />;
        case "set-lines":
            return <SetLinesEditor {...props} action={props.action} onChange={props.onChange} />;
        case "set-account":
            return <SetAccountEditor {...props} action={props.action} onChange={props.onChange} />;
        case "set-category":
            return <SetCategoryEditor {...props} action={props.action} onChange={props.onChange} />;
        case "delete":
            return <DeleteEditor {...props} action={props.action} onChange={props.onChange} />;
    }
}

function DefaultEditorLayout (props: { children?: React.ReactNode, description: string } & Props<TransactionAction>): React.ReactElement {
    const { t } = useTranslation();
    const actions: Array<{ key: TransactionAction["key"], value: string }> = [
        { key: "set-timestamp", value: t("transaction.set_timestamp") },
        { key: "set-description", value: t("transaction.set_description") },
        { key: "set-amount", value: t("transaction.set_total") },
        { key: "set-lines", value: t("transaction.set_lines") },
        { key: "set-account", value: t("transaction.set_account") },
        { key: "set-category", value: t("transaction.set_category") },
        { key: "delete", value: t("common.delete") }
    ];

    return <div className="filter-group">
        <div className="filter-group--header">
            <InputSelect
                isSmall={true}
                disabled={props.disabled}
                items={[...actions]}
                value={props.action.key}
                onChange={onChange} />
            {props.description}
            {props.delete !== undefined && <InputIconButton className="btn-delete" icon={faTrashCan} onClick={() => props.delete!()} />}
        </div>

        <div className="filter-group--children">
            {props.children}
        </div>
    </div>;

    function onChange (newKey: typeof actions[number]["key"]): void {
        if (newKey === props.action.key) return;
        switch (newKey) {
            case "delete":
                props.onChange({ key: "delete" });
                return;
            case "set-amount":
                props.onChange({ key: "set-amount", value: new Decimal(0) });
                return;
            case "set-description":
            case "set-category":
                props.onChange({ key: newKey, value: "" });
                return;
            case "set-account":
                props.onChange({ key: newKey, value: null, account: "source" });
                return;
            case "set-timestamp":
                props.onChange({ key: "set-timestamp", value: DateTime.now() });
                return;
            case "set-lines":
                props.onChange({ key: "set-lines", value: [] });
        }
    }
}

function SetDescriptionEditor (props: Props<ActionSetDescription>): React.ReactElement {
    const { t } = useTranslation();
    return <DefaultEditorLayout {...props} description={t("transaction.set_description_to_value", { value: props.action.value })}>
        <InputText label={t("transaction.enter_description")!}
            disabled={props.disabled}
            value={props.action.value}
            onChange={e => props.onChange({ ...props.action, value: e.target.value })} />
    </DefaultEditorLayout>;
}

function SetTimestampEditor (props: Props<ActionSetTimestmap>): React.ReactElement {
    const user = useUser();
    const { t } = useTranslation();
    return <DefaultEditorLayout {...props} description={t("transaction.set_timestamp_to_value", { value: formatDateTimeWithUser(props.action.value, user) })}>
        <InputDateTime label={t("transaction.select_timestamp")!}
            disabled={props.disabled}
            fullwidth={false}
            value={props.action.value}
            onChange={value => props.onChange({ ...props.action, value })} />
    </DefaultEditorLayout>;
}

function SetAmountEditor (props: Props<ActionSetAmount>): React.ReactElement {
    const user = useUser();
    const { t } = useTranslation();
    return <DefaultEditorLayout {...props} description={t("transaction.set_total_to_value", { value: formatNumberWithUser(props.action.value, user) })}>
        <InputNumber label={t("transaction.enter_total")!}
            value={props.action.value}
            onChange={value => props.onChange({ ...props.action, value })}
            disabled={props.disabled}
            allowNull={false} />
        <p className="help">{t("transaction.will_not_affect_split_transactions")!}</p>
    </DefaultEditorLayout>;
}

function SetCategoryEditor (props: Props<ActionSetCategory>): React.ReactElement {
    const { t } = useTranslation();
    return <DefaultEditorLayout {...props} description={t("transaction.set_category_to_value", { value: props.action.value })}>
        <InputCategory label="Enter category"
            value={props.action.value}
            onChange={value => props.onChange({ ...props.action, value })}
            disabled={props.disabled} />
        <p className="help">{t("transaction.will_set_category_for_all_lines_on_split")!}</p>
    </DefaultEditorLayout>;
}

function SetAccountEditor (props: Props<ActionSetAccount>): React.ReactElement {
    const { t } = useTranslation();
    const { data: account } = useQuery({
        queryKey: ["account", props.action.value],
        queryFn: getAccount
    });
    const api = useApi();
    const accountTypes = [{ key: "source", value: t("transaction.source") }, { key: "destination", value: t("transaction.destination") }];
    const description = props.action.value === null
        ? (props.action.account === "source" ? t("transaction.set_source_account_to_no_account") : t("transaction.set_destination_account_to_no_account"))
        : (props.action.account === "source"
            ? t("transaction.set_source_account_to_value", { value: `#${props.action.value} ${account?.name ?? "…"}` })
            : t("transaction.set_destination_account_to_value", { value: `#${props.action.value} ${account?.name ?? "…"}` }));
    return <DefaultEditorLayout {...props} description={description}>
        <InputSelect
            items={accountTypes}
            value={props.action.account}
            isFullwidth={true}
            label={t("transaction.source_or_destination")!}
            onChange={value => props.onChange({ ...props.action, account: value as "source" | "destination" })} />
        <InputAccount label={t("transaction.select_account")!}
            value={props.action.value ?? null}
            onChange={value => props.onChange({ ...props.action, value: value?.id ?? null })}
            disabled={props.disabled}
            allowNull={true}
            allowCreateNewAccount={true} />
    </DefaultEditorLayout>;

    async function getAccount (): Promise<Account | null> {
        if (props.action.value === null) {
            return null;
        }

        const result = await api.Account.search({
            from: 0,
            to: 1,
            query: {
                type: 2,
                query: {
                    column: "Id",
                    operator: 0,
                    value: props.action.value,
                    not: false,
                    metaData: false
                }
            },
            descending: false,
            orderByColumn: "Id"
        });

        if (result.data.totalItems === 0) {
            // No items found. Reset the selection
            return null;
        } else {
            return result.data.data[0];
        }
    }
}

function DeleteEditor (props: Props<ActionDelete>): React.ReactElement {
    const { t } = useTranslation();
    return <DefaultEditorLayout {...props} description={t("transaction.delete_transactions")!}>
        {t("automation.transaction.warning_will_delete_all_matching")!}
    </DefaultEditorLayout>;
}

function SetLinesEditor (props: Props<ActionSetLines>): React.ReactElement {
    const { t } = useTranslation();
    if (props.action.value.length === 0) {
        return <DefaultEditorLayout {...props} description={t("transaction.turn_split_into_non_split")}>
            <p>{t("transaction.will_turn_split_into_non_split")}</p>
            <p>{t("transaction.how_to_set_total_after_split_into_nonsplit")}</p>
            <div className="buttons mb-3 mt-1">
                <InputButton onClick={() => onChange([{ description: t("transaction.transaction_line"), amount: new Decimal(0), category: "" }])}>
                    {t("transaction.add_lines")}
                </InputButton>
            </div>
        </DefaultEditorLayout>;
    }

    return <DefaultEditorLayout {...props} description={t("transaction.split_and_set_lines")}>
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
    </DefaultEditorLayout>;

    function onChange (lines: TransactionLine[]): void {
        props.onChange({
            ...props.action,
            value: lines
        });
    }
}
