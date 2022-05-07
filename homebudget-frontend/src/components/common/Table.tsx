import * as React from "react";

export interface Props<T> {
    pageSize: number;

    items?: T[];
    renderItem: (item: T, index: number) => JSX.IntrinsicElements["tr"];

    headings: JSX.IntrinsicElements["tr"];
}

interface State {
    page: number;
}

export default class Tooltip<T> extends React.Component<Props<T>, State> {
    constructor(props: Props<T>) {
        super(props);
        this.state = {
            page: 1,
        }
    }

    public render() {
        if (this.props.items === null) {
            throw "Error";
        }

        let paginatedItems = this.props.items
            .map((item, index) => ({ item: item, index: index }))
            .slice((this.state.page - 1) * this.props.pageSize, this.state.page * this.props.pageSize);
        const lastPage = Math.ceil(this.props.items.length / this.props.pageSize);
        const pagesBesideCurrent = 3;
        let paginationFrom = Math.max(2, this.state.page - pagesBesideCurrent);
        const paginationTo = Math.min(paginationFrom + 1 + pagesBesideCurrent * 2, lastPage);
        if (paginationTo - paginationFrom < pagesBesideCurrent * 2 + 1) {
            paginationFrom = Math.max(2, paginationTo - pagesBesideCurrent * 2 - 1);
        }

        console.log(paginationFrom);
        console.log(paginationTo);

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
                    Displaying items {Math.min(this.props.pageSize * (this.state.page - 1) + 1, this.props.items.length)}&nbsp;
                    to {Math.min(this.props.pageSize * (this.state.page), this.props.items.length)}&nbsp;
                    of {this.props.items.length}
                </p>
                
                <nav className="pagination is-centered" role="navigation" aria-label="pagination" style={{ marginBottom: 0 }}>
                    <ul className="pagination-list">
                        <li>
                            <a className="pagination-link" aria-label="Previous page" onClick={() => this.goToPage(this.state.page - 1)}>
                                <span className="icon">
                                    <i className="fas fa-angle-left"></i>
                                </span>
                            </a>
                        </li>
                        <li>
                            <a className={"pagination-link" + (this.state.page === 1 ? " is-current" : "")}
                                aria-label="Goto page 1" onClick={() => this.goToPage(1)}>1</a>
                        </li>
                        {paginationTo > paginationFrom && Array.from(Array(paginationTo - paginationFrom).keys())
                            .map(page => page + paginationFrom)
                            .map(page => <li>
                                {(page === paginationFrom && page > 2) ||
                                    (page === paginationTo - 1 && page < lastPage - 1)
                                    ? <li key={page}><span className="pagination-ellipsis">&hellip;</span></li>
                                    : <li key={page}><a className={"pagination-link" + (this.state.page === page ? " is-current" : "")}
                                        onClick={() => this.goToPage(page)} aria-label={"Goto page " + page}>{page}</a></li>
                                }
                            </li>)}
                        {lastPage !== 1 && <li>
                            <a className={"pagination-link" + (this.state.page === lastPage ? " is-current" : "")}
                                aria-label={"Goto page " + lastPage} onClick={() => this.goToPage(lastPage)}>{lastPage}</a>
                        </li>}
                        <li>
                            <a className="pagination-link" aria-label="Next page" onClick={() => this.goToPage(this.state.page + 1)}>
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

    private goToPage(page: number): void {
        page = Math.max(1, Math.min(page, Math.ceil(this.props.items.length / this.props.pageSize)));
        this.setState({ page: page });
    }
}