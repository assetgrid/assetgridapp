import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useApi } from "../../lib/ApiClient";
import { Account } from "../../models/account";
import { SearchGroup } from "../../models/search";
import { Pagination } from "../common/Pagination";
import YesNoDisplay from "../input/YesNoDisplay";
import AccountLink from "./AccountLink";

interface Props {
    draw?: number
    query?: SearchGroup
    pageSize?: number
    paginationSize?: number
}

export default function AccountList (props: Props): React.ReactElement {
    const [page, setPage] = React.useState(1);
    const { data: accounts } = useQuery(["account", "list", props.query], fetchItems);
    const pageSize = props.pageSize ?? 20;
    const api = useApi();
    const from = (page - 1) * pageSize;
    const to = page * pageSize;
    const { t } = useTranslation();

    const headings = <tr>
        <th>{t("account.name")}</th>
        <th>{t("account.description")}</th>
        <th>{t("account.identifiers")}</th>
        <th>{t("account.favorite")}</th>
    </tr>;

    return <>
        <table className="table is-fullwidth is-hoverable" style={{ marginBottom: 0 }}>
            <thead>
                {headings}
            </thead>
            <tfoot>
                {headings}
            </tfoot>
            <tbody>
                {accounts?.items.map(account =>
                    <tr key={account.id}>
                        <td><AccountLink account={account} /></td>
                        <td>{account.description}</td>
                        <td>{account.identifiers.join(", ")}</td>
                        <td>
                            <YesNoDisplay value={account.favorite} />
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
        <Pagination goToPage={setPage}
            page={page}
            pageSize={pageSize}
            paginationSize={props.paginationSize ?? 9}
            reversePagination={false}
            totalItems={accounts?.totalItems ?? 0}
        />
    </>;

    async function fetchItems (): Promise<{ items: Account[], totalItems: number, offset: number }> {
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
            totalItems: result.data.totalItems
        };
    }
}
