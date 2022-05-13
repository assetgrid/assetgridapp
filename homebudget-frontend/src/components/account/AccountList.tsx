import axios, { AxiosResponse } from "axios";
import * as React from "react";
import { Link } from "react-router-dom";
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
            axios.post<SearchRequest, AxiosResponse<SearchResponse<Account>>>(`https://localhost:7262/Account/Search`, {
                from: from,
                to: to,
            }).then(res => {
                const accounts: Account[] = res.data.data;
                resolve({
                    items: accounts,
                    offset: from,
                    totalItems: res.data.totalItems,
                    draw: draw
                });
            })
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