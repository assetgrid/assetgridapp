import * as React from "react";
import { Link } from "react-router-dom";
import { routes } from "../../../lib/routes";
import { debounce, emptyQuery } from "../../../lib/Utils";
import { SearchGroup, SearchGroupType, SearchOperator } from "../../../models/search";
import Card from "../../common/Card";
import Hero from "../../common/Hero";
import InputText from "../../input/InputText";
import TransactionFilterEditor from "../../transaction/TransactionFilterEditor";
import TransactionList from "../../transaction/table/TransactionList";
import { useLocation } from "react-router";
import { useTranslation } from "react-i18next";

interface LocationState {
    query: SearchGroup
    searchString: string
    searchMode: "simple" | "advanced"
    orderBy: { column: string, descending: boolean }
    page: number
    selectedTransactions: Set<number>
}

export default function PageTransactions (): React.ReactElement {
    const [draw, setDraw] = React.useState(0);
    const locationState = useLocation().state as Partial<LocationState> | undefined;
    const [query, setQuery] = React.useState<SearchGroup>(typeof locationState?.query === "object" ? locationState.query : emptyQuery);
    const [searchString, setSearchString] = React.useState<string>(typeof (locationState?.searchString) === "string" ? locationState.searchString : "");
    const [searchMode, setSearchMode] = React.useState<"simple" | "advanced">(typeof (locationState?.searchMode) === "string" ? locationState.searchMode : "simple");
    const [orderBy, setOrderBy] = React.useState<{ column: string, descending: boolean }>(typeof locationState?.orderBy === "object" ? locationState.orderBy : { column: "DateTime", descending: true });
    const [page, setPage] = React.useState(typeof (locationState?.page) === "number" ? locationState.page : 1);
    const [selectedTransactions, setSelectedTransactions] = React.useState<Set<number>>(typeof locationState?.selectedTransactions === "object" ? locationState.selectedTransactions : new Set());
    const { t } = useTranslation();

    // Match query and search string (don't run this on first render. Only on subsequent changes to search string)
    const isFirst = React.useRef(true);
    React.useEffect(() => {
        if (!isFirst.current) {
            updateSearchQueryFromText();
        }
        isFirst.current = false;
    }, [searchString]);

    React.useEffect(() => {
        if (typeof (locationState?.query) === "object") {
            setQuery(locationState.query);
        }
        if (locationState?.searchMode === "simple" || locationState?.searchMode === "advanced") {
            setSearchMode(locationState.searchMode);
        }
    }, [locationState?.query, locationState?.searchMode]);

    // Keep history state updated
    const updateHistoryDebounced = React.useCallback(debounce(updateHistory, 300), []);
    React.useEffect(() => {
        updateHistoryDebounced({ query, searchMode, page, orderBy, searchString, selectedTransactions });
    }, [query, searchMode, page, orderBy, searchString, selectedTransactions]);

    // The table query is modified separately and debounced from the main query to prevent excessive redraws when modifying the query
    const [tableQuery, setTableQuery] = React.useState<SearchGroup>(query);
    const setTableQueryDebounced = React.useCallback(debounce((query: SearchGroup) => { setTableQuery(query); setDraw(draw => draw + 1); }, 300), []);
    const first = React.useRef(true);
    React.useEffect(() => {
        if (!first.current) {
            setTableQueryDebounced(query);
        }
        first.current = false;
    }, [query]);

    return <>
        <Hero title={t("transaction.transactions")} subtitle={t("transaction.browse_transactions")} />
        <div className="p-3">
            <Card title={t("search.search")!} isNarrow={false}>
                {searchMode === "simple"
                    ? <>
                        <InputText
                            label={t("search.search_for_transactions")!}
                            value={searchString}
                            onChange={e => setSearchString(e.target.value)} />
                        <a onClick={() => setSearchMode("advanced")}>{t("search.advanced_search")}</a>
                    </>
                    : <>
                        <TransactionFilterEditor disabled={false} query={query} setQuery={setQuery} />
                        <a onClick={() => setSearchMode("simple")}>{t("search.simple_search")}</a>
                    </>}
            </Card>
            <Card title={t("common.actions")!} isNarrow={false}>
                <Link to={routes.transactionCreate()} state={{ allowBack: true }}
                    className="button is-primary">
                    {t("transaction.create_new")}
                </Link>
            </Card>
            <Card title={t("transaction.transactions")!} isNarrow={false}>
                <TransactionList
                    query={tableQuery}
                    draw={draw}
                    allowLinks={true}
                    allowEditing={true}
                    page={[page, setPage]}
                    orderBy={[orderBy, orderBy => { setOrderBy(orderBy); setDraw(draw => draw + 1); }]}
                    selectedTransactions={[selectedTransactions, setSelectedTransactions]}
                />
            </Card>
        </div>
    </>;

    function updateHistory (state: any): void {
        const { query, searchMode, page, orderBy, searchString, selectedTransactions } = state;
        window.history.replaceState({
            ...window.history.state,
            usr: {
                query,
                searchMode,
                page,
                orderBy,
                searchString: (searchString?.trim() ?? "") === "" ? null : searchString,
                selectedTransactions
            }
        }, "");
    }

    function updateSearchQueryFromText (): void {
        if (searchString?.trim() === "") {
            setQuery(emptyQuery);
            return;
        }

        setQuery({
            type: SearchGroupType.Or,
            children: [{
                type: SearchGroupType.Query,
                query: {
                    column: "Id",
                    not: false,
                    operator: SearchOperator.Equals,
                    value: Number(searchString.replace(/\D/g, "")),
                    metaData: false
                }
            },
            {
                type: SearchGroupType.Query,
                query: {
                    column: "Description",
                    not: false,
                    operator: SearchOperator.Contains,
                    value: searchString,
                    metaData: false
                }
            }]
        });
    }
}
