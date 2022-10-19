import * as React from "react";
import { Api } from "../../lib/ApiClient";
import { Account } from "../../models/account";
import { SearchGroup } from "../../models/search";
import Table from "../common/Table";
import YesNoDisplay from "../input/YesNoDisplay";
import AccountLink from "./AccountLink";

interface Props {
    draw?: number
    query?: SearchGroup
}

export default function AccountList (props: Props): React.ReactElement {
    const [page, setPage] = React.useState(1);

    return <Table
        headings={<tr>
            <th>Name</th>
            <th>Description</th>
            <th>Identifiers</th>
            <th>Favorite</th>
        </tr>}
        page={page}
        goToPage={setPage}
        pageSize={20}
        draw={props.draw}
        type="async"
        renderType="table"
        fetchItems={fetchItems}
        renderItem={account =>
            <tr key={account.id}>
                <td><AccountLink account={account} /></td>
                <td>{account.description}</td>
                <td>{account.identifiers.join(", ")}</td>
                <td>
                    <YesNoDisplay value={account.favorite} />
                </td>
            </tr>}
    />;

    async function fetchItems (api: Api, from: number, to: number, draw: number): Promise<{ items: Account[], totalItems: number, offset: number, draw: number }> {
        const result = await api.Account.search({
            from,
            to,
            descending: false,
            orderByColumn: "Id",
            query: props.query
        });
        return {
            items: result.data.data,
            offset: from,
            totalItems: result.data.totalItems,
            draw
        };
    }
}
