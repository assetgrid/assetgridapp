import * as React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDoubleLeft, faAngleDoubleRight, faAngleLeft, faAngleRight } from "@fortawesome/free-solid-svg-icons";
import { Api, useApi } from "../../lib/ApiClient";

export type Props<T> = {
    pageSize: number
    paginationSize?: number
    reversePagination?: boolean

    draw?: number
    afterDraw?: (items: T[]) => void
    page: number
} & (
    /* Support three different ways of fetching data */
    {
        /* A list of items is provided and the table with paginate this. No fetching is done */
        type: "sync"
        items: T[]
        goToPage: (page: number) => void
    } | {
        /* An API request to fetch items will be used. Only the current page is fetched */
        type: "async"
        fetchItems: (api: Api, from: number, to: number, draw: number) => Promise<FetchItemsResult<T>>
        goToPage: (page: number) => void
    } | {
        /*
         * Same as async but also allows for incrementing and decrementing beyond the last of first page
         * Used on data that is grouped by period as well as being paginated
         * This type of table will only redraw explicitely and not on page changes, as page changes are needed to handle period transitions
         */
        type: "async-increment"
        fetchItems: (api: Api, from: number, to: number, draw: number) => Promise<FetchItemsResult<T>>
        goToPage: (page: number | "increment" | "decrement") => void
    }
) & (
    /* Different render styles */
    {
        /* The table is rendered as an ordinary HTML table */
        renderType: "table"
        headings: React.ReactNode
        renderItem: (item: T, index: number) => React.ReactNode
    } | {
        /* The table uses a custom rendering function */
        renderType: "custom"
        render: (items: Array<{ item: T, index: number }>, renderPagination: () => React.ReactElement) => React.ReactElement
    }
);

interface FetchItemsResult<T> {
    items: T[]
    totalItems: number
    offset: number
    draw: number
}

export default function Table<T> (props: Props<T>): React.ReactElement {
    const [items, setItems] = React.useState<T[]>([]);

    const [totalItems, setTotalItems] = React.useState<number>(0);
    const api = useApi();

    const paginatedItems = items
        .map((item, index) => ({ item, index: index + (props.page - 1) * props.pageSize }));

    function goToPage (page: number): void {
        page = Math.max(1, Math.min(page, Math.ceil(totalItems / props.pageSize)));
        props.goToPage(page);
    }

    React.useEffect(() => {
        if (api !== null) {
            void fetchItems(api, props.page, props.draw);
        }
    }, props.type === "async-increment" ? [api, props.draw] : [api, props.draw, props.page]);

    if (props.renderType === "custom") {
        return props.render(paginatedItems, renderPagination);
    }
    return <>
        <table className="table is-fullwidth is-hoverable" style={{ marginBottom: 0 }}>
            <thead>
                {props.headings}
            </thead>
            <tfoot>
                {props.headings}
            </tfoot>
            <tbody>
                {paginatedItems.map(item =>
                    props.renderItem(item.item, item.index)
                )}
            </tbody>
        </table>
        {renderPagination()}
    </>;

    function renderPagination (): React.ReactElement {
        const page = props.page;
        const lastPage = Math.max(1, Math.ceil(totalItems / props.pageSize));
        const pagesBesideCurrent = ((props.paginationSize ?? 9) - 3) / 2;
        let paginationFrom = Math.max(2, page - pagesBesideCurrent);
        const paginationTo = Math.min(paginationFrom + 1 + pagesBesideCurrent * 2, lastPage);
        if (paginationTo - paginationFrom < pagesBesideCurrent * 2 + 1) {
            paginationFrom = Math.max(2, paginationTo - pagesBesideCurrent * 2 - 1);
        }
        const reverse = props.reversePagination ?? false;

        if (reverse) {
            // Reverse pagination
            return <div className="pagination-container">
                <p className="pagination-position">
                    Displaying items {Math.min(props.pageSize * (page - 1) + 1, totalItems)}&nbsp;
                    to {Math.min(props.pageSize * (page), totalItems)}&nbsp;
                    of {totalItems}
                </p>

                <nav className="pagination is-centered" role="navigation" aria-label="pagination" style={{ marginBottom: 0 }}>
                    <ul className="pagination-list">
                        <li>
                            {page === lastPage && props.type === "async-increment"
                                ? <a className="pagination-link" aria-label="Previous page" onClick={() => { props.goToPage("decrement"); }}>
                                    <span className="icon">
                                        <FontAwesomeIcon icon={faAngleDoubleLeft} />
                                    </span>
                                </a>
                                : <a className="pagination-link" aria-label="Previous page" onClick={() => goToPage(page + 1)}>
                                    <span className="icon">
                                        <FontAwesomeIcon icon={faAngleLeft} />
                                    </span>
                                </a>}
                        </li>
                        {lastPage !== 1 && <li>
                            <a className={`pagination-link ${page === lastPage ? " is-current" : ""}`}
                                aria-label={`Goto page ${lastPage}`} onClick={() => goToPage(lastPage)}>{lastPage}</a>
                        </li>}
                        {paginationTo > paginationFrom && Array.from(Array(paginationTo - paginationFrom).keys())
                            .map(page => paginationTo - page - 1)
                            .map(p =>
                                (p === paginationFrom && p > 2) ||
                                    (p === paginationTo - 1 && p < lastPage - 1)
                                    ? <li key={p}><span className="pagination-ellipsis">&hellip;</span></li>
                                    : <li key={p}><a className={"pagination-link" + (page === p ? " is-current" : "")}
                                        onClick={() => goToPage(p)} aria-label={`Goto page ${p}`}>{p}</a></li>
                            )}
                        <li>
                            <a className={`pagination-link ${page === 1 ? " is-current" : ""}`}
                                aria-label="Goto page 1" onClick={() => goToPage(1)}>1</a>
                        </li>
                        <li>
                            {page === 1 && props.type === "async-increment"
                                ? <a className="pagination-link" aria-label="Next page" onClick={() => { props.goToPage("increment"); }}>
                                    <span className="icon">
                                        <FontAwesomeIcon icon={faAngleDoubleRight} />
                                    </span>
                                </a>
                                : <a className="pagination-link" aria-label="Next page" onClick={() => goToPage(page - 1)}>
                                    <span className="icon">
                                        <FontAwesomeIcon icon={faAngleRight} />
                                    </span>
                                </a>}
                        </li>
                    </ul>
                </nav>
            </div>;
        } else {
            // Ordinary pagination
            return <div className="pagination-container">
                <p className="pagination-position">
                    Displaying items {Math.min(props.pageSize * (page - 1) + 1, totalItems)}&nbsp;
                    to {Math.min(props.pageSize * (page), totalItems)}&nbsp;
                    of {totalItems}
                </p>

                <nav className="pagination is-centered" role="navigation" aria-label="pagination" style={{ marginBottom: 0 }}>
                    <ul className="pagination-list">
                        <li>
                            {page === 1 && props.type === "async-increment"
                                ? <a className="pagination-link" aria-label="Previous page" onClick={() => { props.goToPage("decrement"); }}>
                                    <span className="icon">
                                        <FontAwesomeIcon icon={faAngleDoubleLeft} />
                                    </span>
                                </a>
                                : <a className="pagination-link" aria-label="Previous page" onClick={() => goToPage(page - 1)}>
                                    <span className="icon">
                                        <FontAwesomeIcon icon={faAngleLeft} />
                                    </span>
                                </a>}
                        </li>
                        <li>
                            <a className={"pagination-link" + (page === 1 ? " is-current" : "")}
                                aria-label="Goto page 1" onClick={() => goToPage(1)}>1</a>
                        </li>
                        {paginationTo > paginationFrom && Array.from(Array(paginationTo - paginationFrom).keys())
                            .map(page => page + paginationFrom)
                            .map(p =>
                                (p === paginationFrom && p > 2) ||
                                    (p === paginationTo - 1 && p < lastPage - 1)
                                    ? <li key={p}><span className="pagination-ellipsis">&hellip;</span></li>
                                    : <li key={p}><a className={"pagination-link" + (page === p ? " is-current" : "")}
                                        onClick={() => goToPage(p)} aria-label={`Goto page ${p}`}>{p}</a></li>
                            )}
                        {lastPage !== 1 && <li>
                            <a className={"pagination-link" + (page === lastPage ? " is-current" : "")}
                                aria-label={`Goto page ${lastPage}`} onClick={() => goToPage(lastPage)}>{lastPage}</a>
                        </li>}
                        <li>
                            {page === lastPage && props.type === "async-increment"
                                ? <a className="pagination-link" aria-label="Next page" onClick={() => { props.goToPage("increment"); }}>
                                    <span className="icon">
                                        <FontAwesomeIcon icon={faAngleDoubleRight} />
                                    </span>
                                </a>
                                : <a className="pagination-link" aria-label="Next page" onClick={() => goToPage(page + 1)}>
                                    <span className="icon">
                                        <FontAwesomeIcon icon={faAngleRight} />
                                    </span>
                                </a>}
                        </li>
                    </ul>
                </nav>
            </div>;
        }
    }

    async function fetchItems (api: Api, page: number, draw?: number): Promise<void> {
        const from = (page - 1) * props.pageSize;
        const to = page * props.pageSize;

        if (props.type === "sync") {
            setItems(props.items.slice(from, to));
            setTotalItems(props.items.length);
            if (props.afterDraw != null) {
                props.afterDraw(props.items.slice(from, to));
            }
        } else {
            const result = await props.fetchItems(api, from, to, draw ?? 0);
            if (result.draw === (props.draw ?? 0)) {
                setItems(result.items);
                setTotalItems(result.totalItems);
                if (props.afterDraw !== undefined) {
                    props.afterDraw(result.items);
                }
            }
        }
    }
}
