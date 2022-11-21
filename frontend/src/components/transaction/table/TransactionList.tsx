import * as React from "react";
import { Transaction } from "../../../models/transaction";
import { SearchGroup, SearchGroupType, SearchOperator } from "../../../models/search";
import { useApi } from "../../../lib/ApiClient";
import TransactionTableLine from "./TransactionTableLine";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDownAZ, faArrowDownShortWide, faArrowDownWideShort, faArrowDownZA, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import InputCheckbox from "../../input/InputCheckbox";
import { useNavigate } from "react-router";
import { routes } from "../../../lib/routes";
import MergeTransactionsModal from "./../input/MergeTransactionsModal";
import DropdownContent from "../../common/DropdownContent";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Pagination } from "../../common/Pagination";

interface Props {
    draw?: number
    query?: SearchGroup
    allowEditing?: boolean
    allowLinks?: boolean
    small?: boolean
    pageSize?: number

    page?: [number, (page: number) => void]
    orderBy?: [{ column: string, descending: boolean }, (value: { column: string, descending: boolean }) => void]
    selectedTransactions?: [Set<number>, (transactions: Set<number>) => void]
    selectedTransaction?: [number | null, (value: number | null) => void]
}

export default React.memo(TransactionList, (a, b) =>
    a.draw === b.draw &&
    a.query === b.query &&
    a.allowEditing === b.allowEditing &&
    a.small === b.small &&
    a.pageSize === b.pageSize &&
    a.selectedTransactions?.[0] === b.selectedTransactions?.[0] &&
    a.selectedTransaction?.[0] === b.selectedTransaction?.[0] &&
    a.orderBy?.[0] === b.orderBy?.[0] &&
    a.page?.[0] === b.page?.[0]);
function TransactionList (props: Props): React.ReactElement {
    const [orderBy, setOrderBy] = (props.orderBy != null) ? props.orderBy : React.useState<{ column: string, descending: boolean }>({ column: "DateTime", descending: true });
    const [selectedTransactions, setSelectedTransactions] = (props.selectedTransactions != null) ? props.selectedTransactions : React.useState<Set<number>>(new Set());
    const [isMergingTransactions, setIsMergingTransactions] = React.useState(false);
    const [page, setPage] = (props.page != null) ? props.page : React.useState(1);
    const navigate = useNavigate();
    const pageSize = props.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = page * pageSize;
    const api = useApi();
    const { t } = useTranslation();

    const { data, isError } = useQuery({
        queryKey: ["transaction", "list", {
            from,
            to,
            query: props.query,
            orderBy
        }],
        keepPreviousData: true,
        queryFn: fetchItems,
        onSuccess: result => {
            if (result.totalItems < (page - 1) * pageSize) {
                setPage(1);
            }
        }
    });

    const firstRender = React.useRef(true);

    if (isError) {
        return <div>{t("common.error_occured")}</div>;
    }

    const className = "transaction-table table is-fullwidth is-hoverable" +
        (props.allowEditing !== true ? " no-actions" : " multi-select") +
        (props.small === true ? " is-small" : "");
    return <>
        <div className={className}>
            <TableHeading
                selectedTransactions={selectedTransactions}
                setSelectedTransactions={setSelectedTransactions}
                allowEditing={props.allowEditing === true}
                selectAllTransactions={selectAllTransactions}
                beginEditMultiple={beginEditMultiple}
                beginMerging={() => setIsMergingTransactions(true)}
                orderBy={orderBy}
                setOrderBy={setOrderBy}
            />
            <div className="table-body">
                {data?.items.map(transaction => {
                    return <TransactionTableLine
                        key={transaction.id}
                        transactionId={transaction.id}
                        allowSelection={props.selectedTransaction !== undefined || props.selectedTransactions !== undefined}
                        allowEditing={props.allowEditing}
                        allowLinks={props.allowLinks}
                        transaction={transaction}
                        selected={selectedTransactions.has(transaction.id) || props.selectedTransaction?.[0] === transaction.id}
                        toggleSelected={toggleSelected} />;
                })}
            </div>
            <TableHeading
                selectedTransactions={selectedTransactions}
                setSelectedTransactions={setSelectedTransactions}
                allowEditing={props.allowEditing === true}
                selectAllTransactions={selectAllTransactions}
                beginEditMultiple={beginEditMultiple}
                beginMerging={() => setIsMergingTransactions(true)}
                orderBy={orderBy}
                setOrderBy={setOrderBy}
            />
        </div>
        <Pagination goToPage={setPage}
            page={page}
            pageSize={pageSize}
            paginationSize={9}
            reversePagination={false}
            totalItems={data?.totalItems ?? 0}
        />
        {(props.selectedTransactions != null) && <MergeTransactionsModal active={isMergingTransactions}
            close={() => setIsMergingTransactions(false)}
            transactions={selectedTransactions}
            merged={() => setIsMergingTransactions(false) } />}
    </>;

    async function fetchItems (): Promise<{ items: Transaction[], totalItems: number, offset: number }> {
        const result = await api.Transaction.search({
            from,
            to,
            query: props.query,
            descending: orderBy.descending,
            orderByColumn: orderBy.column
        });
        const transactions: Transaction[] = result.data;

        // If it's not the first render, reset selected transactions
        if (!firstRender.current) {
            setSelectedTransactions(new Set());
        }
        firstRender.current = false;

        return {
            items: transactions,
            offset: from,
            totalItems: result.totalItems
        };
    };

    function toggleSelected (transaction: Transaction): void {
        if (props.selectedTransactions != null) {
            if (selectedTransactions.has(transaction.id)) {
                deselectTransaction(transaction);
            } else {
                setSelectedTransactions(new Set([...selectedTransactions, transaction.id]));
            }
        }

        if (props.selectedTransaction != null) {
            if (props.selectedTransaction[0] === transaction.id) {
                props.selectedTransaction[1](null);
            } else {
                props.selectedTransaction[1](transaction.id);
            }
        }
    }

    function beginEditMultiple (type: "selection" | "all"): void {
        if (props.query == null) {
            // Multi edit requires a query
            return;
        }
        const query: SearchGroup = type === "all"
            ? props.query
            : {
                type: SearchGroupType.And,
                children: [{
                    type: SearchGroupType.Query,
                    query: {
                        column: "Id",
                        not: false,
                        operator: SearchOperator.In,
                        value: [...selectedTransactions],
                        metaData: false
                    }
                }]
            };

        navigate(routes.transactionEditMultiple(), {
            state: {
                query,
                showBack: true
            }
        });
    }

    function deselectTransaction (transaction: Transaction): void {
        const newSelectedTransactions = new Set(selectedTransactions);
        newSelectedTransactions.delete(transaction.id);
        setSelectedTransactions(newSelectedTransactions);
    }

    function selectAllTransactions (): void {
        const newSelectedTransactions: Set<number> = new Set(data?.items.map(t => t.id));
        setSelectedTransactions(newSelectedTransactions);
    }
}

interface DropdownButtonProps {
    selectAll: () => void
    clearSelection: () => void
    selected: boolean
    editSelection: () => void
    editSelectionDisabled: boolean
    editAll: () => void
    editAllText: string
    mergeSelection: () => void
}
export function TransactionSelectDropdownButton (props: DropdownButtonProps): React.ReactElement {
    const [open, setOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const { t } = useTranslation();

    return <div onBlur={onBlur}
        className={"buttons has-addons btn-multiselect dropdown is-trigger" + (open ? " is-active" : "")}>
        <button className="button is-small" onClick={() => props.selected ? props.clearSelection() : props.selectAll()}>
            <InputCheckbox
                onChange={() => 0}
                value={props.selected} />
        </button>
        <button className="button is-small" aria-haspopup="true" onClick={() => setOpen(true)}>
            <FontAwesomeIcon icon={faChevronDown} />
        </button>
        <DropdownContent active={open} fullWidth={false} preferedPosition="right">
            <div className={"dropdown-menu"} role="menu" style={{ maxWidth: "none" }} tabIndex={0} ref={dropdownRef}>
                <div className="dropdown-content">
                    <a className="dropdown-item"
                        onClick={() => !props.editSelectionDisabled && props.editSelection()}
                        style={props.editSelectionDisabled ? { color: "#999", cursor: "default" } : undefined}>
                        {t("common.modify_selection")}
                    </a>
                    <a className="dropdown-item"
                        onClick={() => !props.editSelectionDisabled && props.mergeSelection()}
                        style={props.editSelectionDisabled ? { color: "#999", cursor: "default" } : undefined}>
                        {t("transaction.merge_selected")}
                    </a>
                    <a className="dropdown-item" onClick={props.editAll}>
                        {props.editAllText}
                    </a>
                </div>
            </div>
        </DropdownContent>
    </div>;

    function onBlur (e: React.FocusEvent): void {
        if (!e.currentTarget.contains(e.relatedTarget as Node) && !(dropdownRef.current?.contains(e.relatedTarget as Node) ?? false)) {
            setOpen(false);
        }
    }
}

interface TableHeadingProps {
    selectedTransactions: Set<number>
    setSelectedTransactions: (value: Set<number>) => void
    selectAllTransactions: () => void
    beginEditMultiple: (type: "selection" | "all") => void
    beginMerging: () => void
    allowEditing: boolean
    orderBy: { column: string, descending: boolean }
    setOrderBy: (value: { column: string, descending: boolean }) => void
}
function TableHeading (props: TableHeadingProps): React.ReactElement {
    const { t } = useTranslation();
    return <div className="table-heading">
        <div>
            {props.allowEditing && <TransactionSelectDropdownButton
                clearSelection={() => props.setSelectedTransactions(new Set())}
                selectAll={() => props.selectAllTransactions()}
                selected={props.selectedTransactions.size > 0}
                editSelection={() => props.beginEditMultiple("selection")}
                editSelectionDisabled={props.selectedTransactions.size === 0}
                editAll={() => props.beginEditMultiple("all")}
                editAllText={t("transaction.modify_all_matching_current_search")}
                mergeSelection={() => props.beginMerging()}
            />}
        </div>
        {renderColumnHeader(t("common.timestamp"), "DateTime", "numeric")}
        {renderColumnHeader(t("common.description"), "Description", "string")}
        {renderColumnHeader(t("common.amount"), "Total", "numeric", true)}
        {renderColumnHeader(t("transaction.source"), "SourceAccount.Name", "string")}
        {renderColumnHeader(t("transaction.destination"), "DestinationAccount.Name", "string")}
        {renderColumnHeader(t("common.category"), "Category", "string")}
        {props.allowEditing && <div>
            {t("common.actions")}
        </div>}
    </div>;

    function renderColumnHeader (title: string, columnName: string, type: "numeric" | "string", rightAligned?: boolean): React.ReactElement {
        let sortIcon: React.ReactElement | undefined;
        if (props.orderBy.column === columnName) {
            switch (type) {
                case "numeric":
                    sortIcon = props.orderBy.descending
                        ? <span className="icon"><FontAwesomeIcon icon={faArrowDownWideShort} /></span>
                        : <span className="icon"><FontAwesomeIcon icon={faArrowDownShortWide} /></span>;
                    break;
                case "string":
                    sortIcon = props.orderBy.descending
                        ? <span className="icon"><FontAwesomeIcon icon={faArrowDownZA} /></span>
                        : <span className="icon"><FontAwesomeIcon icon={faArrowDownAZ} /></span>;
                    break;
            }
        }

        return <div className={"column-header sortable" + (rightAligned === true ? " has-text-right" : "")}
            onClick={() => switchOrderBy(columnName)}>
            {title}
            {sortIcon}
        </div>;
    }

    function switchOrderBy (column: string): void {
        if (props.orderBy.column === column) {
            props.setOrderBy({ column, descending: !props.orderBy.descending });
        } else {
            props.setOrderBy({ column, descending: false });
        }
    }
}
