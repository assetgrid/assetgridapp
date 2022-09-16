import * as React from "react";
import { Transaction } from "../../models/transaction";
import Table from "../common/Table";
import { SearchGroup, SearchRequest } from "../../models/search";
import { Api } from "../../lib/ApiClient";
import TransactionTableLine from "./TransactionTableLine";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDownAZ, faArrowDownShortWide, faArrowDownWideShort, faArrowDownZA } from "@fortawesome/free-solid-svg-icons";

interface Props {
    draw?: number;
    query?: SearchGroup;
    allowEditing?: boolean;
    allowLinks?: boolean;
    small?: boolean;
    pageSize?: number;
}

export default function TransactionList(props: Props) {
    const [draw, setDraw] = React.useState(0);
    const [orderBy, setOrderBy] = React.useState<{ column: string, descending: boolean }>({ column: "DateTime", descending: true });

    return <Table<Transaction>
        pageSize={props.pageSize ?? 20}
        draw={(props.draw ?? 0) + draw}
        type="async"
        renderType="custom"
        fetchItems={fetchItems}
        render={renderTable}
    />;
    
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
            {renderColumnHeader("Id", "Id", "numeric")}
            {renderColumnHeader("Timestamp", "DateTime", "numeric")}
            {renderColumnHeader("Description", "Description", "string")}
            {renderColumnHeader("Amount", "Total", "numeric", true)}
            {renderColumnHeader("Source", "SourceAccountId", "numeric")}
            {renderColumnHeader("Destination", "DestinationAccountId", "numeric")}
            {renderColumnHeader("Category", "Category", "string")}
            {props.allowEditing && <div>Actions</div>}
        </div>;

        const className = "transaction-table table is-fullwidth is-hoverable" +
            (props.allowEditing !== true ? " no-actions" : "") +
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
                            allowLinks={props.allowLinks}/>
                    })}
                </div>
                {heading}
            </div>
            {renderPagination()}
        </>;
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
            setOrderBy(orderBy => ({ column, descending: !orderBy.descending }))
        } else {
            setOrderBy({ column, descending: false })
        }
        setDraw(draw => draw + 1);
    }
}