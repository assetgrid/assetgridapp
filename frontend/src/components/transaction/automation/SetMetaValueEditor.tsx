import * as React from "react";
import { useTranslation } from "react-i18next";
import { ActionSetMetaValue } from "../../../models/automation/transactionAutomation";
import { TransactionActionEditorProps, DefaultTransactionEditorLayout } from "./TransactionActionEditor";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "../../../lib/ApiClient";
import { FieldValueType, MetaField } from "../../../models/meta";
import { faAngleDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import DropdownContent from "../../common/DropdownContent";
import TransactionMetaInput, { MetaFieldType } from "../input/TransactionMetaInput";
import { Account } from "../../../models/account";
import { Transaction } from "../../../models/transaction";
import Decimal from "decimal.js";
import { useUser } from "../../App";
import { formatNumberWithUser } from "../../../lib/Utils";

export function SetMetaValueEditor (props: TransactionActionEditorProps<ActionSetMetaValue>): React.ReactElement {
    const { t } = useTranslation();
    const api = useApi();
    const user = useUser();
    const { data: fields, isError } = useQuery({ queryKey: ["meta"], queryFn: api.Meta.list });
    const [field, setField] = React.useState<MetaField | null>(
        fields !== undefined && props.action.fieldId !== null ? fields.find(x => x.id === props.action.fieldId) ?? null : null
    );
    React.useEffect(() => {
        setField(fields !== undefined && props.action.fieldId !== null ? fields.find(x => x.id === props.action.fieldId) ?? null : null);
    }, [props.action.fieldId, fields]);

    let prettyValue = "";
    const value = props.action.value;
    if (props.action.value !== null) {
        switch (field?.valueType) {
            case undefined:
                prettyValue = "";
                break;
            case FieldValueType.TextLine:
            case FieldValueType.TextLong:
                prettyValue = value as string;
                break;
            case FieldValueType.Account:
                prettyValue = `#${(value as Account).id} ${(value as Account).name}`;
                break;
            case FieldValueType.Transaction:
                prettyValue = `#${(value as Transaction).id} ${(value as Transaction).description}`;
                break;
            case FieldValueType.Number:
                prettyValue = formatNumberWithUser(value as Decimal, user);
                break;
            case FieldValueType.Boolean:
                prettyValue = value === true ? t("common.yes") : t("common.no");
                break;
            case FieldValueType.Attachment:
                prettyValue = t("common.file");
        }
    }

    return <DefaultTransactionEditorLayout {...props}
        description={t("transaction.set_meta_field_value", { fieldName: field?.name ?? "", value: prettyValue })}>
        <InputMetaField
            label={t("meta.field_name")!}
            disabled={false}
            onChange={value => fieldChanged(value)}
            value={field}
            fields={fields?.filter(x => x.valueType !== FieldValueType.Attachment)}
            errors={isError ? [t("common.error_occured")] : undefined} />
        { field !== null && <TransactionMetaInput
            disabled={false}
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            field={{
                value: props.action.value,
                type: field.valueType
            } as MetaFieldType}
            onChange={value => props.onChange({ ...props.action, value })}
        /> }
    </DefaultTransactionEditorLayout>;

    function fieldChanged (newValue: MetaField): void {
        if (field === null || newValue.valueType !== field.valueType) {
            props.onChange({ ...props.action, fieldId: newValue.id, value: null });
        } else {
            props.onChange({ ...props.action, fieldId: newValue.id });
        }
    }
}

interface InputMetaFieldProps {
    label?: string
    value: MetaField | null
    fields: MetaField[] | undefined
    disabled: boolean
    onChange: (field: MetaField) => void
    errors?: string[]
}
function InputMetaField (props: InputMetaFieldProps): React.ReactElement {
    let text: string;
    const isError = props.errors !== undefined && props.errors.length > 0;
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const { t } = useTranslation();

    if (props.value === null) {
        text = t("meta.select_field");
    } else {
        text = `${props.value.name}`;
    }

    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [dropdownOptions, setDropdownOptions] = React.useState<MetaField[] | null>(null);
    React.useEffect(() => {
        refreshDropdown(searchQuery);
    }, [props.fields]);

    return <div className="field" onBlur={onBlur}>
        {/* Label */}
        {props.label !== undefined && <label className="label">{props.label}</label>}

        <div className={"dropdown is-fullwidth" + (open && !props.disabled ? " is-active" : "") + (isError ? " is-danger" : "")}>
            <div className="dropdown-trigger">
                <button className="button" aria-haspopup="true" onClick={() => setOpen(true) } disabled={props.disabled}>
                    <span>{text}</span>
                    <span className="icon is-small">
                        <FontAwesomeIcon icon={faAngleDown} />
                    </span>
                </button>
            </div>
            <DropdownContent active={open} fullWidth={true}>
                <div className={"dropdown-menu"} role="menu" ref={dropdownRef} tabIndex={0}>
                    <div className="dropdown-content">
                        <input
                            className="dropdown-item"
                            style={{ border: "0" }}
                            type="text"
                            placeholder={t("search.search_for_meta_field")!}
                            value={searchQuery}
                            disabled={props.disabled}
                            onChange={e => refreshDropdown(e.target.value) }
                        />
                        <hr className="dropdown-divider" />
                        {dropdownOptions == null && <div className="dropdown-item">{t("common.loading_suggestions")}</div>}
                        {dropdownOptions?.map(option => <a
                            className={"dropdown-item" + (props.value?.id === option.id ? " is-active" : "")}
                            key={option.id}
                            onClick={() => setSelected(option)}>
                            {option.name}
                        </a>)}
                    </div>
                </div>
            </DropdownContent>
        </div>
        {isError && <p className="help has-text-danger">
            {props.errors![0]}
        </p>}
    </div>;

    function setSelected (value: MetaField): void {
        setSearchQuery("");
        setOpen(false);
        props.onChange(value);
    }

    function refreshDropdown (searchQuery: string): void {
        if (props.fields === undefined) return;

        setDropdownOptions(props.fields
            .filter(x => x.name.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase()))
            .slice(0, 5));
        setSearchQuery(searchQuery);
    }

    function onBlur (e: React.FocusEvent): void {
        if (!e.currentTarget.contains(e.relatedTarget as Node) && !(dropdownRef.current?.contains(e.relatedTarget as Node) ?? false)) {
            setOpen(false);
        }
    }
}
