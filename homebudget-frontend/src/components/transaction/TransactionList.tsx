import * as React from "react";
import { Transaction } from "../../models/transaction";
import Table from "../common/Table";
import { SearchGroup, SearchGroupType, SearchOperator, SearchRequest } from "../../models/search";
import { Api } from "../../lib/ApiClient";
import TransactionTableLine from "./TransactionTableLine";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDownAZ, faArrowDownShortWide, faArrowDownWideShort, faArrowDownZA, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import InputButton from "../input/InputButton";
import InputCheckbox from "../input/InputCheckbox";
import { useNavigate } from "react-router";
import { routes } from "../../lib/routes";
import { render } from "react-dom";

interface Props {
    draw?: number;
    query?: SearchGroup;
    allowEditing?: boolean;
    allowLinks?: boolean;
    small?: boolean;
    pageSize?: number;

    page?: [number, (page: number) => void];
    orderBy?: [{ column: string, descending: boolean }, (value: { column: string, descending: boolean }) => void];
    selectedTransactions?: [{ [id: number]: boolean }, (transactions: { [id: number]: boolean }) => void]
}

export default React.memo(TransactionList, (a, b) =>
    a.draw === b.draw &&
    a.query === b.query &&
    a.allowEditing === b.allowEditing &&
    a.small === b.small &&
    a.pageSize === b.pageSize &&
    a.selectedTransactions?.[0] === b.selectedTransactions?.[0] &&
    a.orderBy?.[0] === b.orderBy?.[0] &&
    a.page?.[0] === b.page?.[0]);
function TransactionList(props: Props) {
    const [draw, setDraw] = React.useState(0);
    const [orderBy, setOrderBy] = props.orderBy ? props.orderBy : React.useState<{ column: string, descending: boolean }>({ column: "DateTime", descending: true });
    const [selectedTransactions, setSelectedTransactions] = props.selectedTransactions ? props.selectedTransactions : React.useState<{ [id: number]: boolean }>({});
    const [shownTransactions, setShownTransactions] = React.useState<Transaction[]>([]);
    const [page, setPage] = props.page ? props.page : React.useState(1);
    const navigate = useNavigate();

    const firstRender = React.useRef(true);

    return <>
        <Table<Transaction>
            page={page}
            goToPage={setPage}
            pageSize={props.pageSize ?? 20}
            draw={(props.draw ?? 0) + draw}
            type="async"
            renderType="custom"
            fetchItems={fetchItems}
            render={renderTable}
            afterDraw={transactions => setShownTransactions(transactions)}
        />
    </>;
    
    function fetchItems(from: number, to: number, draw: number): Promise<{ items: Transaction[], totalItems: number, offset: number, draw: number }> {
        return new Promise(resolve => {
            Api.Transaction.search({
                from: from,
                to: to,
                query: props.query,
                descending: orderBy.descending,
                orderByColumn: orderBy.column
            } as SearchRequest).then(result => {
                const transactions: Transaction[] = result.data;

                // If it's not the first render, reset selected transactions
                if (!firstRender.current) {
                    setSelectedTransactions({});
                }
                firstRender.current = false;

                resolve({
                    items: transactions,
                    draw: draw,
                    offset: from,
                    totalItems: result.totalItems
                });
            })
        });
    };

    function renderTable(items: { item: Transaction, index: number }[], renderPagination: () => React.ReactElement): React.ReactElement {
        const heading = <div className="table-heading">
            {props.allowEditing && <div>
                <DropdownButton
                    clearSelection={() => setSelectedTransactions({})}
                    selectAll={() => selectAllTransactions()}
                    selected={Object.keys(selectedTransactions).length > 0}
                    editSelection={() => beginEditMultiple("selection")}
                    editSelectionDisabled={Object.keys(selectedTransactions).length === 0}
                    editAll={() => beginEditMultiple("all")}
                />
            </div>}
            {renderColumnHeader("Id", "Id", "numeric")}
            {renderColumnHeader("Timestamp", "DateTime", "numeric")}
            {renderColumnHeader("Description", "Description", "string")}
            {renderColumnHeader("Amount", "Total", "numeric", true)}
            {renderColumnHeader("Source", "SourceAccountId", "numeric")}
            {renderColumnHeader("Destination", "DestinationAccountId", "numeric")}
            {renderColumnHeader("Category", "Category", "string")}
            {props.allowEditing && <div>
                Actions
            </div>}
        </div>;

        const className = "transaction-table table is-fullwidth is-hoverable" +
            (props.allowEditing !== true ? " no-actions" : " multi-select") +
            (props.small === true ? " is-small" : "");
        
        return <>
            <div className={className}>
                {heading}
                <div className="table-body">
                    {items.map(({ item: transaction }) => {
                        return <TransactionTableLine
                            key={transaction.id}
                            transaction={transaction}
                            updateItem={() => setDraw(draw => draw + 1)}
                            allowEditing={props.allowEditing}
                            allowLinks={props.allowLinks}
                            selected={selectedTransactions[transaction.id] === true}
                            toggleSelected={() => selectedTransactions[transaction.id] === true
                                ? deselectTransaction(transaction)
                                : setSelectedTransactions({ ...selectedTransactions, [transaction.id]: true })} />
                    })}
                </div>
                {heading}
            </div>
            {renderPagination()}
        </>;
    }

    function beginEditMultiple(type: "selection" | "all") {
        if (!props.query) {
            // Multi edit requires a query
            return;
        }

        const query: SearchGroup = type == "all"
            ? props.query
            : {
                type: SearchGroupType.Query,
                query: {
                    column: "Id",
                    not: false,
                    operator: SearchOperator.In,
                    value: Object.keys(selectedTransactions).map(id => Number(id))
                }
            };
        
        navigate(routes.transactionEditMultiple(), {
            state: {
                query: query,
                showBack: true,
            }
        });
    }

    function deselectTransaction(transaction: Transaction) {
        let newSelectedTransactions = { ...selectedTransactions };
        delete newSelectedTransactions[transaction.id];
        setSelectedTransactions(newSelectedTransactions);
    }

    function selectAllTransactions() {
        let newSelectedTransactions: {[id: number]: boolean} = {};
        shownTransactions.forEach(t => newSelectedTransactions[t.id] = true);
        setSelectedTransactions(newSelectedTransactions);
    }

    function renderColumnHeader(title: string, columnName: string, type: "numeric" | "string", rightAligned?: boolean): React.ReactElement {
        let sortIcon: React.ReactElement | undefined = undefined;
        if (orderBy.column === columnName)
        {
            switch (type) {
                case "numeric":
                    sortIcon = orderBy.descending
                        ? <span className="icon"><FontAwesomeIcon icon={faArrowDownWideShort} /></span>
                        : <span className="icon"><FontAwesomeIcon icon={faArrowDownShortWide} /></span>
                    break;
                case "string":
                    sortIcon = orderBy.descending
                        ? <span className="icon"><FontAwesomeIcon icon={faArrowDownZA} /></span>
                        : <span className="icon"><FontAwesomeIcon icon={faArrowDownAZ} /></span>
                    break;
            }
        }

        return <div className={"column-header sortable" + (rightAligned ? " has-text-right" : "")}
            onClick={() => switchOrderBy(columnName)}>
            {title}
            {sortIcon}
        </div>;
    }

    function switchOrderBy(column: string) {
        if (orderBy.column === column) {
            setOrderBy({ column, descending: !orderBy.descending })
        } else {
            setOrderBy({ column, descending: false })
        }
        if (props.orderBy === undefined) {
            setDraw(draw => draw + 1);
        }
    }
}

interface DropdownButtonProps {
    selectAll: () => void;
    clearSelection: () => void;
    selected: boolean;
    editSelection: () => void;
    editSelectionDisabled: boolean;
    editAll: () => void;
}
function DropdownButton(props: DropdownButtonProps): React.ReactElement {
    const [open, setOpen] = React.useState(false);

    return <div tabIndex={0}
        onBlur={e => !e.currentTarget.contains(e.relatedTarget as Node) && setOpen(false)}
        className={"buttons has-addons btn-multiselect dropdown is-trigger" + (open ? " is-active" : "")}>
        <button className="button is-small" onClick={() => props.selected ? props.clearSelection() : props.selectAll()}>
            <InputCheckbox
                onChange={() => 0}
                value={props.selected} />
        </button>
        <button className="button is-small" aria-haspopup="true" onClick={() => setOpen(true)}>
            <FontAwesomeIcon icon={faChevronDown} />
        </button>
        <div className={"dropdown-menu"} role="menu" style={{ maxWidth: "none" }}>
            <div className="dropdown-content">
                <a className="dropdown-item"
                    onClick={() => ! props.editSelectionDisabled && props.editSelection()}
                    style={props.editSelectionDisabled ? { color: "#999", cursor: "default" } : undefined}>
                    Modify selection
                </a>
                <a className="dropdown-item" onClick={props.editAll}>
                    Modify all transactions matching current search
                </a>
            </div>
        </div>
    </div>;
}