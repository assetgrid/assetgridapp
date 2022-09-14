import * as React from "react";
import { Transaction } from "../../models/transaction";
import Table from "../common/Table";
import { SearchGroup, SearchRequest } from "../../models/search";
import { Api } from "../../lib/ApiClient";
import TransactionTableLine from "./TransactionTableLine";
import { preferencesContext } from "../App";

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
                query: props.query
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
            <div></div>
            <div>Date</div>
            <div>Description</div>
            <div className="has-text-right">Amount</div>
            <div>Source</div>
            <div>Destination</div>
            <div>Category</div>
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
}