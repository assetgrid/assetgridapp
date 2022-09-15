import * as React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDoubleLeft, faAngleDoubleRight, faAngleLeft, faAngleRight } from "@fortawesome/free-solid-svg-icons";

export type Props<T> = {
    pageSize: number;
    paginationSize?: number;
    reversePagination?: boolean;
    
    decrement?: () => void;
    increment?: () => void;
    draw?: number;
} & (
    /* Support three different ways of fetching data*/
    {
        /* A list of items is provided and the table with paginate this. No fetching is done */
        type: "sync";
        items: T[];
    } | {
        /* An API request to fetch items will be used. Only the current page is fetched */
        type: "async";
        fetchItems: (from: number, to: number, draw: number) => Promise<FetchItemsResult<T>>;
    } | {
        /* 
         * Same as async but also allows for incrementing and decrementing beyond the last of first page
         * Used on data that is grouped by period as well as being paginated
         */
        type: "async-increment";
        page: number,
        goToPage: (page: number) => void
        fetchItems: (from: number, to: number, draw: number) => Promise<FetchItemsResult<T>>;
    }
) & (
    /* Different render styles */
    {
        /* The table is rendered as an ordinary HTML table */
        renderType: "table";
        headings: React.ReactNode;
        renderItem: (item: T, index: number) => React.ReactNode;
    } | {
        /* The table uses a custom rendering function */
        renderType: "custom";
        render: (items: { item: T, index: number }[], renderPagination: () => React.ReactElement) => React.ReactElement;
    } 
)

interface FetchItemsResult<T> {
    items: T[];
    totalItems: number;
    offset: number;
    draw: number;
}

export default function Table<T>(props: Props<T>) {
    const [items, setItems] = React.useState<T[]>([]);

    let targetPage: number;
    let setTargetPage: React.Dispatch<number> | null = null;
    if (props.type !== "async-increment") {
        [targetPage, setTargetPage] = React.useState<number>(1);
    } else {
        targetPage = props.page;
    }

    const [displayingPage, setDisplayingPage] = React.useState<number>(1);
    const [totalItems, setTotalItems] = React.useState<number>(0);

    let paginatedItems = items
        .map((item, index) => ({ item: item, index: index + (targetPage - 1) * props.pageSize }));
    
    function goToPage(page: number): void {
        page = Math.max(1, Math.min(page, Math.ceil(totalItems / props.pageSize)));
        if (props.type === "async-increment") {
            props.goToPage(page);
        } else if (setTargetPage) {
            setTargetPage(page);
        }
    }

    if (props.type === "async-increment") {
        React.useEffect(() => {
            fetchItems(targetPage, props.draw);
        }, [props.draw]);
    } else {
        React.useEffect(() => {
            fetchItems(targetPage, props.draw);
        }, [targetPage, props.draw]);
    }

    if (props.renderType === "custom")
    {
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

    function renderPagination<T>() {
        const page = targetPage;
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
                            {page === lastPage && props.decrement
                                ? <a className="pagination-link" aria-label="Previous page" onClick={() => { props.decrement!(); }}>
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
                            <a className={"pagination-link" + (page === lastPage ? " is-current" : "")}
                                aria-label={"Goto page " + lastPage} onClick={() => goToPage(lastPage)}>{lastPage}</a>
                        </li>}
                        {paginationTo > paginationFrom && Array.from(Array(paginationTo - paginationFrom).keys())
                            .map(page => paginationTo - page - 1)
                            .map(p =>
                                (p === paginationFrom && p > 2) ||
                                    (p === paginationTo - 1 && p < lastPage - 1)
                                    ? <li key={p}><span className="pagination-ellipsis">&hellip;</span></li>
                                    : <li key={p}><a className={"pagination-link" + (page === p ? " is-current" : "")}
                                        onClick={() => goToPage(p)} aria-label={"Goto page " + p}>{p}</a></li>
                            )}
                        <li>
                            <a className={"pagination-link" + (page === 1 ? " is-current" : "")}
                                aria-label="Goto page 1" onClick={() => goToPage(1)}>1</a>
                        </li>
                        <li>
                            {page === 1 && props.increment
                                ? <a className="pagination-link" aria-label="Next page" onClick={() => { props.increment!(); }}>
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
                            {page === 1 && props.decrement
                                ? <a className="pagination-link" aria-label="Previous page" onClick={() => { props.decrement!(); }}>
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
                                        onClick={() => goToPage(p)} aria-label={"Goto page " + p}>{p}</a></li>
                            )}
                        {lastPage !== 1 && <li>
                            <a className={"pagination-link" + (page === lastPage ? " is-current" : "")}
                                aria-label={"Goto page " + lastPage} onClick={() => goToPage(lastPage)}>{lastPage}</a>
                        </li>}
                        <li>
                            {page === lastPage && props.increment
                                ? <a className="pagination-link" aria-label="Next page" onClick={() => { props.increment!(); }}>
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

    async function fetchItems<T>(page: number, draw?: number): Promise<void> {
        const from = (page - 1) * props.pageSize;
        const to = page * props.pageSize;

        if (props.type === "sync") {
            setItems(props.items.slice(from, to));
            setTotalItems(props.items.length);
            setDisplayingPage(targetPage);
        } else {
            props.fetchItems(from, to, draw ?? 0)
                .then(result => {
                    if (result.draw === (props.draw ?? 0)) {
                        setItems(result.items);
                        setTotalItems(result.totalItems);
                        setDisplayingPage(targetPage);
                    }
                });
        }
    }
}