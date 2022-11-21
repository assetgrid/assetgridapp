import * as React from "react";
import { Pagination } from "./Pagination";

export interface Props<T> {
    pageSize: number
    paginationSize?: number
    reversePagination?: boolean

    headings: React.ReactNode
    items: T[]
    page: number
    goToPage: (page: number) => void
    renderItem: (item: T, index: number) => React.ReactNode
};

/**
 * Display a long list of values with a paginated table
 */
export default function Table<T> (props: Props<T>): React.ReactElement {
    const from = (props.page - 1) * props.pageSize;
    const to = props.page * props.pageSize;
    const paginatedItems = props.items
        .slice(from, to)
        .map((item, index) => ({ item, index: index + (props.page - 1) * props.pageSize }));

    React.useEffect(() => {
        // Go to page 1 whenever the items change
        props.goToPage(1);
    }, [props.items]);

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
        <Pagination goToPage={props.goToPage}
            page={props.page}
            pageSize={props.pageSize}
            paginationSize={props.paginationSize ?? 9}
            reversePagination={props.reversePagination ?? false}
            totalItems={props.items.length}
        />
    </>;
}
