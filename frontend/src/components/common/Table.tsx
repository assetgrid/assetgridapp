import * as React from "react";
import { Api, useApi } from "../../lib/ApiClient";
import { Pagination } from "./Pagination";

export type Props<T> = {
    pageSize: number
    paginationSize?: number
    reversePagination?: boolean

    draw?: number
    afterDraw?: (items: T[]) => void
    page: number

    headings: React.ReactNode
    renderItem: (item: T, index: number) => React.ReactNode
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

    React.useEffect(() => {
        if (api !== null) {
            void fetchItems(api, props.page, props.draw);
        }
    }, [api, props.draw, props.page]);

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
            totalItems={totalItems}
        />
    </>;

    async function fetchItems (api: Api, page: number, draw?: number): Promise<void> {
        const from = (page - 1) * props.pageSize;
        const to = page * props.pageSize;

        if (props.type === "sync") {
            if (props.items.length !== totalItems && props.page !== 1) {
                props.goToPage(1);
            }
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
