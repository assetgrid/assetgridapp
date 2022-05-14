import axios, { AxiosResponse } from "axios";
import * as React from "react";
import { Link } from "react-router-dom";
import { Api } from "../../lib/ApiClient";
import { routes } from "../../lib/routes";
import { Account } from "../../models/account";
import { SearchRequest, SearchResponse } from "../../models/search";
import Table from "../common/Table";

interface Props {
    draw?: number;
}

export default class AccountList extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
    }

    private fetchItems(from: number, to: number, draw: number): Promise<{ items: Account[], totalItems: number, offset: number, draw: number }> {
        return new Promise(resolve => {
            Api.Account.search({
                from: from,
                to: to
            }).then(result => {
                resolve({
                    items: result.data,
                    offset: from,
                    totalItems: result.totalItems,
                    draw: draw
                });
            });
        });
    }

    public render() {
        return <Table
            headings={<tr>
                <th>Id</th>
                <th>Name</th>
                <th>Description</th>
                <th>Account number</th>
            </tr>}
            pageSize={20}
            draw={this.props.draw}
            fetchItems={this.fetchItems}
            renderItem={account =>
                <tr key={account.id}>
                    <td>{account.id}</td>
                    <td><Link to={routes.account(account.id.toString())}>{account.name}</Link></td>
                    <td>{account.description}</td>
                    <td>{account.accountNumber}</td>
                </tr>}
            />;
    }
}