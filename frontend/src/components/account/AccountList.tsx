import * as React from "react";
import { useTranslation } from "react-i18next";
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
    const { t } = useTranslation();

    return <Table
        headings={<tr>
            <th>{t("account.name")}</th>
            <th>{t("account.description")}</th>
            <th>{t("account.identifiers")}</th>
            <th>{t("account.favorite")}</th>
        </tr>}
        page={page}
        goToPage={setPage}
        pageSize={20}
        draw={props.draw}
        type="async"
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
