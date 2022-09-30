import axios, { AxiosResponse } from "axios";
import * as React from "react";
import { Link } from "react-router-dom";
import { Api } from "../../lib/ApiClient";
import { routes } from "../../lib/routes";
import { Account } from "../../models/account";
import { SearchRequest, SearchResponse } from "../../models/search";
import Table from "../common/Table";
import YesNoDisplay from "../input/YesNoDisplay";
import AccountLink from "./AccountLink";

interface Props {
    draw?: number;
}

function fetchItems(api: Api, from: number, to: number, draw: number): Promise<{ items: Account[], totalItems: number, offset: number, draw: number }> {
    return new Promise(resolve => {
        api.Account.search({
            from: from,
            to: to,
            descending: false,
            orderByColumn: "Id"
        }).then(result => {
            resolve({
                items: result.data.data,
                offset: from,
                totalItems: result.data.totalItems,
                draw: draw
            });
        });
    });
}

export default function AccountList(props: Props) {
    const [page, setPage] = React.useState(1);

    return <Table
        headings={<tr>
            <th>Name</th>
            <th>Description</th>
            <th>Account number</th>
            <th>Favorite</th>
            <th>In net worth</th>
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
                <td>{account.accountNumber}</td>
                <td>
                    <YesNoDisplay value={account.favorite} />
                </td>
                <td>
                    <YesNoDisplay value={account.includeInNetWorth} />
                </td>
            </tr>}
        />;
}