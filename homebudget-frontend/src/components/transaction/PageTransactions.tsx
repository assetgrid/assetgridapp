import * as React from "react";
import { Link } from "react-router-dom";
import { routes } from "../../lib/routes";
import { Preferences } from "../../models/preferences";
import { SearchGroup, SearchGroupType } from "../../models/search";
import { Card } from "../common/Card";
import TransactionFilterEditor from "./filter/TransactionFilterEditor";
import TransactionList from "./TransactionList";

interface Props {
    preferences: Preferences | "fetching";
}

let requestNumber = 0;
export default function PageTransactions(props: Props) {
    const [query, setQuery] = React.useState<SearchGroup>({
        type: SearchGroupType.And,
        children: []
    });
    const [draw, setDraw] = React.useState(0);

    React.useEffect(() => {
        // If query changed wait for one second before refetching, to prevent too many requests
        let currentRequestNumber = ++requestNumber;
            setTimeout(() => {
                if (currentRequestNumber == requestNumber) {
                    setDraw(draw => draw + 1);
                }
            }, 500);
    }, [query]);

    return <>
        <section className="hero has-background-primary">
            <div className="hero-body">
                <p className="title has-text-white">Transactions</p>
            </div>
        </section>
        <div className="p-3">
            <Card title="Transactions">
                <TransactionFilterEditor query={query} setQuery={setQuery} />
                <Link to={routes.createTransaction()}
                    className="button">
                    Create Transaction
                </Link>
            
                <TransactionList preferences={props.preferences} query={query} draw={draw} />
            </Card>
        </div>
    </>;
}
