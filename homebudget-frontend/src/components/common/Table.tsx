import * as React from "react";

export interface Props<T> {
    pageSize: number;

    items?: T[];
    fetchItems?: (from: number, to: number) => Promise<FetchItemsResult<T>>;
    renderItem: (item: T, index: number) => JSX.IntrinsicElements["tr"];

    headings: JSX.IntrinsicElements["tr"];
}

interface FetchItemsResult<T> {
    items: T[];
    totalItems: number;
    offset: number;
}

interface State<T> {
    targetPage: number;

    items: T[];
    displayingPage: number;
    totalItems: number;
}

export default class Table<T> extends React.Component<Props<T>, State<T>> {
    constructor(props: Props<T>) {
        super(props);
        this.state = {
            targetPage: 1,
            displayingPage: 1,

            items: [],
            totalItems: 0
        }

        this.fetchItems(0, this.props.pageSize);
    }

    public render() {
        const page = this.state.targetPage;
        let paginatedItems = this.state.items
            .map((item, index) => ({ item: item, index: index + (page - 1) * this.props.pageSize }));
        const lastPage = Math.max(1, Math.ceil(this.state.totalItems / this.props.pageSize));
        const pagesBesideCurrent = 3;
        let paginationFrom = Math.max(2, page - pagesBesideCurrent);
        const paginationTo = Math.min(paginationFrom + 1 + pagesBesideCurrent * 2, lastPage);
        if (paginationTo - paginationFrom < pagesBesideCurrent * 2 + 1) {
            paginationFrom = Math.max(2, paginationTo - pagesBesideCurrent * 2 - 1);
        }

        return <>
            <table className="table is-fullwidth is-hoverable" style={{marginBottom: 0}}>
                <thead>
                    {this.props.headings}
                </thead>
                <tfoot>
                    {this.props.headings}
                </tfoot>
                <tbody>
                    {paginatedItems.map(item => 
                        this.props.renderItem(item.item, item.index)
                    )}
                </tbody>
            </table>
            <div className="pagination-container">
                <p className="pagination-position">
                    Displaying items {Math.min(this.props.pageSize * (page - 1) + 1, this.state.totalItems)}&nbsp;
                    to {Math.min(this.props.pageSize * (page), this.state.totalItems)}&nbsp;
                    of {this.state.totalItems}
                </p>
                
                <nav className="pagination is-centered" role="navigation" aria-label="pagination" style={{ marginBottom: 0 }}>
                    <ul className="pagination-list">
                        <li>
                            <a className="pagination-link" aria-label="Previous page" onClick={() => this.goToPage(page - 1)}>
                                <span className="icon">
                                    <i className="fas fa-angle-left"></i>
                                </span>
                            </a>
                        </li>
                        <li>
                            <a className={"pagination-link" + (page === 1 ? " is-current" : "")}
                                aria-label="Goto page 1" onClick={() => this.goToPage(1)}>1</a>
                        </li>
                        {paginationTo > paginationFrom && Array.from(Array(paginationTo - paginationFrom).keys())
                            .map(page => page + paginationFrom)
                            .map(p =>
                                (p === paginationFrom && p > 2) ||
                                (p === paginationTo - 1 && p < lastPage - 1)
                                    ? <li key={p}><span className="pagination-ellipsis">&hellip;</span></li>
                                    : <li key={p}><a className={"pagination-link" + (page === p ? " is-current" : "")}
                                        onClick={() => this.goToPage(p)} aria-label={"Goto page " + p}>{p}</a></li>
                            )}
                        {lastPage !== 1 && <li>
                            <a className={"pagination-link" + (page === lastPage ? " is-current" : "")}
                                aria-label={"Goto page " + lastPage} onClick={() => this.goToPage(lastPage)}>{lastPage}</a>
                        </li>}
                        <li>
                            <a className="pagination-link" aria-label="Next page" onClick={() => this.goToPage(page + 1)}>
                                <span className="icon">
                                    <i className="fas fa-angle-right"></i>
                                </span>
                            </a>
                        </li>
                    </ul>
                </nav>
            </div>
        </>;
    }

    private defaultFetchItems(from: number, to: number): Promise<FetchItemsResult<T>> {
        if (this.props.items === null) {
            throw "Error";
        }
        return new Promise<FetchItemsResult<T>>(resolve => {
            resolve({
                items: this.props.items.slice(from, to),
                totalItems: this.props.items.length,
                offset: from
            })
        });
    }

    private fetchItems(from: number, to: number): void {
        (this.props.fetchItems !== undefined
            ? this.props.fetchItems(from, to)
            : this.defaultFetchItems(from, to))
            .then(result => result.offset === (this.state.targetPage - 1) * this.props.pageSize && this.setState({
                items: result.items,
                totalItems: result.totalItems,
                displayingPage: this.state.targetPage
            }));
    }

    private goToPage(page: number): void {
        page = Math.max(1, Math.min(page, Math.ceil(this.state.totalItems / this.props.pageSize)));
        this.setState({ targetPage: page });
        this.fetchItems((page - 1) * this.props.pageSize, page * this.props.pageSize);
    }
}