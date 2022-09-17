import * as React from "react";
import { Link } from "react-router-dom";
import { routes } from "../../lib/routes";
import { debounce } from "../../lib/Utils";
import { Preferences } from "../../models/preferences";
import { SearchGroup, SearchGroupType, SearchOperator } from "../../models/search";
import { Card } from "../common/Card";
import InputText from "../input/InputText";
import TransactionFilterEditor from "../transaction/filter/TransactionFilterEditor";
import TransactionList from "../transaction/TransactionList";

const defaultQuery: SearchGroup = {
    type: SearchGroupType.And,
    children: [],
};

export default function PageTransactions() {
    const [query, setQuery] = React.useState<SearchGroup>(window.history.state.query ? window.history.state : defaultQuery);
    const [draw, setDraw] = React.useState(0);
    const incrementDrawDebounced = React.useCallback(debounce(() => setDraw(draw => draw + 1), 500), []);
    const [searchString, setSearchString] = React.useState(typeof (window.history.state.searchString) === "string" ? window.history.state.searchString : "");
    const [searchMode, setSearchMode] = React.useState<"simple" | "advanced">(typeof (window.history.state.searchMode) === "string" ? window.history.state.searchMode : "simple");
    const [orderBy, setOrderBy] = React.useState<{ column: string, descending: boolean }>(window.history.state.orderBy ? window.history.state.orderBy : { column: "DateTime", descending: true });
    const [page, setPage] = React.useState(typeof(window.history.state.page) === "number" ? window.history.state.page : 1);

    // Match query and search string
    React.useEffect(updateSearchQueryFromText, [searchString])

    // Keep state updated
    React.useEffect(() => {
        window.history.replaceState({
            ...window.history.state,
            query: query,
            searchMode: searchMode,
            page: page,
            orderBy: orderBy,
            searchString: searchString,
        }, "");
    }, [query, searchMode, page, orderBy, searchString]);

    return <>
        <section className="hero has-background-primary">
            <div className="hero-body">
                <p className="title has-text-white">Transactions</p>
            </div>
        </section>
        <div className="p-3">
            <Card title="Actions">
                <Link to={routes.createTransaction()}
                    className="button">
                    Create Transaction
                </Link>
            </Card>
            <Card title="Search">
                {searchMode === "simple"
                    ? <>
                        <InputText
                            label="Search for transactions"
                            value={searchString}
                            onChange={e => setSearchString(e.target.value)} />
                        <a onClick={() => setSearchMode("advanced")}>Advanced search</a>
                    </>
                    : <>
                        <TransactionFilterEditor query={query} setQuery={setQueryAndRedrawTable} />
                        <a onClick={() => setSearchMode("simple")}>Simple search</a>
                    </>}
            </Card>
            <Card title="Transactions">
                <TransactionList
                    query={query}
                    draw={draw}
                    allowLinks={true}
                    allowEditing={true}
                    page={page}
                    setPage={setPage}
                    orderBy={orderBy}
                    setOrderBy={setOrderBy}
                />
            </Card>
        </div>
    </>;

    function setQueryAndRedrawTable(query: SearchGroup) {
        setQuery(query);
        incrementDrawDebounced();
    }

    function updateSearchQueryFromText() {
        if (searchString.trim() === "") {
            if (query !== defaultQuery) {
                setQueryAndRedrawTable(defaultQuery);
            }
            return;
        }

        setQueryAndRedrawTable({
            type: SearchGroupType.Or,
            children: [{
                type: SearchGroupType.Query,
                query: {
                    column: "Id",
                    not: false,
                    operator: SearchOperator.Equals,
                    value: Number(searchString.replace(/\D/g, '')),
                }
            },
            {
                type: SearchGroupType.Query,
                query: {
                    column: "Description",
                    not: false,
                    operator: SearchOperator.Contains,
                    value: searchString,
                }
            },
            {
                type: SearchGroupType.Query,
                query: {
                    column: "Identifier",
                    not: false,
                    operator: SearchOperator.Contains,
                    value: searchString,
                }
            }]
        })
    }
}
