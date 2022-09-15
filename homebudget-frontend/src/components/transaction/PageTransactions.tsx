import * as React from "react";
import { Link } from "react-router-dom";
import { routes } from "../../lib/routes";
import { debounce } from "../../lib/Utils";
import { Preferences } from "../../models/preferences";
import { SearchGroup, SearchGroupType } from "../../models/search";
import { Card } from "../common/Card";
import TransactionFilterEditor from "./filter/TransactionFilterEditor";
import TransactionList from "./TransactionList";

export default function PageTransactions() {
    const [query, setQuery] = React.useState<SearchGroup>({
        type: SearchGroupType.And,
        children: [],
    });
    const [draw, setDraw] = React.useState(0);
    const incrementDrawDebounced = React.useCallback(debounce(() => setDraw(draw => draw + 1), 500), []);

    return <>
        <section className="hero has-background-primary">
            <div className="hero-body">
                <p className="title has-text-white">Transactions</p>
            </div>
        </section>
        <div className="p-3">
            <Card title="Transactions">
                <TransactionFilterEditor query={query} setQuery={setQueryAndRedrawTable} />
                <Link to={routes.createTransaction()}
                    className="button">
                    Create Transaction
                </Link>
            
                <TransactionList
                    query={query}
                    draw={draw}
                    allowLinks={true}
                    allowEditing={true}
                />
            </Card>
        </div>
    </>;

    function setQueryAndRedrawTable(query: SearchGroup) {
        setQuery(query);
        incrementDrawDebounced();
    }
}
