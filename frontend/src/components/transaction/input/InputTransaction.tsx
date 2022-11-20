import * as React from "react";
import { SearchGroup } from "../../../models/search";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDown, faXmark } from "@fortawesome/free-solid-svg-icons";
import { Api, useApi } from "../../../lib/ApiClient";
import { debounce, formatDateTimeWithUser } from "../../../lib/Utils";
import DropdownContent from "../../common/DropdownContent";
import { Transaction } from "../../../models/transaction";
import { useTranslation } from "react-i18next";
import { useUser } from "../../App";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
    label?: string
    value: number | Transaction | null
    disabled: boolean
    allowNull: boolean
    onChange: (transaction: Transaction | null) => void
    nullSelectedText?: string
    errors?: string[]
}

export default function InputTransaction (props: Props): React.ReactElement {
    let text: string;
    const isError = props.errors !== undefined && props.errors.length > 0;
    const [transaction, setTransaction] = React.useState<Transaction | null>(props.value !== null && typeof (props.value) !== "number" ? props.value : null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const user = useUser();
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    if (props.value === null) {
        if (props.nullSelectedText !== undefined) {
            text = props.nullSelectedText;
        } else {
            text = t("transaction.select_transaction");
        }
    } else if (transaction == null) {
        if (typeof props.value === "number") {
            text = `# ${props.value} …`;
        } else {
            text = `# ${props.value.id} ${props.value.description}`;
        }
    } else {
        text = `# ${transaction.id} ${transaction.description}`;
    }

    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [dropdownOptions, setDropdownOptions] = React.useState<Transaction[] | null>(null);
    const selectedTransactionId = transaction?.id ?? props.value as number;
    const api = useApi();

    // Fetch the transaction based on the id in the props, if none is available
    React.useEffect(() => {
        if (props.value !== null && typeof (props.value) === "number" && (transaction === null || props.value !== transaction.id)) {
            // An id was provided. Fetch the transaction
            void updateTransaction();
        }
    }, [api, props.value]);

    // Fetch dropdown options
    React.useEffect(() => {
        if (api !== null) {
            refreshDropdownDebounced(api, searchQuery);
        }
    }, [searchQuery, api]);

    const refreshDropdownDebounced = React.useCallback(debounce(refreshDropdown, 300), []);

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
                {props.allowNull && !props.disabled && props.value !== null && <button className="button"
                    onClick={() => setSelectedTransaction(null)}
                    disabled={props.disabled}>
                    <span className="icon is-small">
                        <FontAwesomeIcon icon={faXmark} />
                    </span>
                </button>}
            </div>
            <DropdownContent active={open} fullWidth={true}>
                <div className={"dropdown-menu"} role="menu" ref={dropdownRef} tabIndex={0}>
                    <div className="dropdown-content">
                        <input
                            className="dropdown-item"
                            style={{ border: "0" }}
                            type="text"
                            placeholder={t("search.search_for_transaction")!}
                            value={searchQuery}
                            disabled={props.disabled || api === null}
                            onChange={e => setSearchQuery(e.target.value) }
                        />
                        <hr className="dropdown-divider" />
                        {dropdownOptions == null && <div className="dropdown-item">{t("common.loading_suggestions")}</div>}
                        {dropdownOptions?.map(option => <a
                            className={"dropdown-item" + (selectedTransactionId === option.id ? " is-active" : "")}
                            key={option.id}
                            onClick={() => setSelectedTransaction(option)}>
                            <div className="has-text-link" style={{ fontSize: "0.8em" }}>{formatDateTimeWithUser(option.dateTime, user)}</div>
                            #{option.id} {option.description}
                        </a>)}
                    </div>
                </div>
            </DropdownContent>
        </div>
        {isError && <p className="help has-text-danger">
            {props.errors![0]}
        </p>}
    </div>;

    /**
     * Select transaction
     */
    function setSelectedTransaction (transaction: Transaction | null): void {
        setTransaction(transaction);
        setSearchQuery("");
        setOpen(false);
        props.onChange(transaction);
    }

    async function refreshDropdown (api: Api, searchQuery: string): Promise<void> {
        let query: SearchGroup | undefined;
        if (searchQuery !== "") {
            query = {
                type: 0,
                children: [
                    {
                        type: 2,
                        query: {
                            column: "Id",
                            operator: 0,
                            value: Number(searchQuery.replace(/\D/g, "")),
                            not: false,
                            metaData: false
                        }
                    },
                    {
                        type: 2,
                        query: {
                            column: "Description",
                            operator: 1,
                            value: searchQuery,
                            not: false,
                            metaData: false
                        }
                    }
                ]
            };
        }

        const result = await queryClient.fetchQuery(["transaction", "list", "inputtransaction", searchQuery],
            async () => await api.Transaction.search({
                from: 0,
                to: 5,
                query,
                descending: false,
                orderByColumn: "Id"
            }));
        setDropdownOptions(result.data);
    }

    /**
     * Fetch the selected transaction, if it hasn't yet been fetched
     */
    async function updateTransaction (): Promise<void> {
        if (api === null) return;

        const result = await api.Transaction.search({
            from: 0,
            to: 1,
            query: {
                type: 2,
                query: {
                    column: "Id",
                    operator: 0,
                    value: props.value as number,
                    not: false,
                    metaData: false
                }
            },
            descending: false,
            orderByColumn: "Id"
        });

        if (result.data.length === 0) {
            // No items found. Reset the selection
            props.onChange(null);
        } else {
            setTransaction(result.data[0]);
        }
    }

    function onBlur (e: React.FocusEvent): void {
        if (!e.currentTarget.contains(e.relatedTarget as Node) && !(dropdownRef.current?.contains(e.relatedTarget as Node) ?? false)) {
            setOpen(false);
        }
    }
}
