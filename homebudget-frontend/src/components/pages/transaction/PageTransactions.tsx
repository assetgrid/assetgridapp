import * as React from "react";
import { Link } from "react-router-dom";
import { routes } from "../../../lib/routes";
import { debounce, emptyQuery } from "../../../lib/Utils";
import { SearchGroup, SearchGroupType, SearchOperator } from "../../../models/search";
import { Card } from "../../common/Card";
import InputText from "../../input/InputText";
import TransactionFilterEditor from "../../transaction/filter/TransactionFilterEditor";
import TransactionList from "../../transaction/TransactionList";

export default function PageTransactions() {
    const [draw, setDraw] = React.useState(0);
    const incrementDrawDebounced = React.useCallback(debounce(() => setDraw(draw => draw + 1), 500), []);

    const history = window.history.state.usr;
    const [query, setQuery] = React.useState<SearchGroup>(history?.query ? history.query : emptyQuery);
    const [searchString, setSearchString] = React.useState(typeof(history?.searchString) === "string" ? history.searchString : "");
    const [searchMode, setSearchMode] = React.useState<"simple" | "advanced">(typeof (history?.searchMode) === "string" ? history.searchMode : "simple");
    const [orderBy, setOrderBy] = React.useState<{ column: string, descending: boolean }>(history?.orderBy ? history.orderBy : { column: "DateTime", descending: true });
    const [page, setPage] = React.useState(typeof(history?.page) === "number" ? history.page : 1);
    const [selectedTransactions, setSelectedTransactions] = React.useState<{ [id: number]: boolean }>(history?.selectedTransactions ? history.selectedTransactions : {});

    // Match query and search string (don't run this on first render. Only on subsequent changes to search string)
    const isFirst = React.useRef(true);
    React.useEffect(() => {
        if (! isFirst.current) {
            updateSearchQueryFromText();
        }
        isFirst.current = false;
    }, [searchString])

    // Keep state updated
    React.useEffect(() => {
        window.history.replaceState({
            ...window.history.state,
            usr: {
                query,
                searchMode,
                page,
                orderBy,
                searchString,
                selectedTransactions
            }
        }, "");
    }, [query, searchMode, page, orderBy, searchString, selectedTransactions]);

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
                    page={[page, setPage]}
                    orderBy={[orderBy, orderBy => { setOrderBy(orderBy); setDraw(draw => draw + 1) }]}
                    selectedTransactions={[selectedTransactions, setSelectedTransactions]}
                />
            </Card>
        </div>
    </>;

    function setQueryAndRedrawTable(query: SearchGroup) {
        setQuery(query);
        incrementDrawDebounced();
    }

    function updateSearchQueryFromText() {
        if (searchString === "") {
            setQueryAndRedrawTable(emptyQuery);
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
