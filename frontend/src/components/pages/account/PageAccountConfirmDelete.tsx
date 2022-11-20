import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router";

import { Link } from "react-router-dom";
import { useApi } from "../../../lib/ApiClient";
import { routes } from "../../../lib/routes";
import { forget } from "../../../lib/Utils";
import { Account } from "../../../models/account";
import { SearchGroup, SearchGroupType, SearchOperator } from "../../../models/search";
import { User } from "../../../models/user";
import { useUser } from "../../App";
import Card from "../../common/Card";
import Hero from "../../common/Hero";
import InputButton from "../../input/InputButton";
import TransactionList from "../../transaction/table/TransactionList";
import Page404 from "../Page404";
import PageError from "../PageError";

export default function PageAccountConfirmDelete (): React.ReactElement {
    const id = Number(useParams().id);
    const [isDeleting, setisDeleting] = React.useState(false);
    const [account, setAccount] = React.useState<Account | null | "fetching" | "error">(typeof history.state.usr?.account === "object"
        ? history.state.usr.account
        : "fetching");
    const allowBack = history.state.usr?.allowBack === true;
    const navigate = useNavigate();
    const user = useUser();
    const queryClient = useQueryClient();
    const api = useApi();
    const { t } = useTranslation();

    // Update account when id is changed
    React.useEffect(() => {
        if (isNaN(id)) {
            setAccount("error");
        }
        if (account === "fetching" && api !== null) {
            api.Account.get(id)
                .then(result => {
                    setAccount(result);
                })
                .catch(e => {
                    console.log(e);
                    setAccount("error");
                });
        }
    }, [api, id]);

    if (account === "fetching") {
        return <>{t("common.please_wait")}</>;
    }
    if (account === null) {
        return <Page404 />;
    }
    if (account === "error" || account.id !== id) {
        return <PageError />;
    }

    /* Query returning transactions that reference this account and no other account */
    const query: SearchGroup = {
        type: SearchGroupType.Or,
        children: [{
            type: SearchGroupType.And,
            children: [
                {
                    type: SearchGroupType.Query,
                    query: {
                        column: "SourceAccountId",
                        value: null,
                        operator: SearchOperator.Equals,
                        not: false,
                        metaData: false
                    }
                },
                {
                    type: SearchGroupType.Query,
                    query: {
                        column: "DestinationAccountId",
                        value: account.id,
                        operator: SearchOperator.Equals,
                        not: false,
                        metaData: false
                    }
                }
            ]
        }, {
            type: SearchGroupType.And,
            children: [
                {
                    type: SearchGroupType.Query,
                    query: {
                        column: "SourceAccountId",
                        value: account.id,
                        operator: SearchOperator.Equals,
                        not: false,
                        metaData: false
                    }
                },
                {
                    type: SearchGroupType.Query,
                    query: {
                        column: "DestinationAccountId",
                        value: null,
                        operator: SearchOperator.Equals,
                        not: false,
                        metaData: false
                    }
                }
            ]
        }]
    };

    return <>
        <Hero title={t("common.delete_account")} subtitle={<>#{account.id} {account.name}</>} isDanger={true} />
        <div className="p-3">
            <Card title={t("common.delete_account")!} isNarrow={false}>
                <p>{t("delete.account.are_you_sure")}</p>
                <p>{t("delete.account.transactions_will_be_deleted")}</p>
                <div className="buttons mt-3">
                    <InputButton onClick={forget(deleteAccount)} disabled={isDeleting || api === null} className="is-danger">{t("common.delete_account")}</InputButton>
                    {allowBack
                        ? <button className="button" onClick={() => navigate(-1)}>Cancel</button>
                        : <Link to={routes.account(id.toString())} className="button" onClick={() => navigate(-1)}>{t("common.cancel")}</Link>}
                </div>
            </Card>
            <Card title={t("delete.account.the_following_transactions_will_be_deleted")!} isNarrow={false}>
                <TransactionList allowEditing={false} allowLinks={false} query={query} />
            </Card>
        </div>
    </>;

    async function deleteAccount (): Promise<void> {
        if (account === null || account === "fetching" || account === "error" || api === null) return;

        setisDeleting(true);
        await api.Account.delete(account.id);
        if (account.favorite) {
            if (user !== undefined) {
                queryClient.setQueryData<User>(["user"], old => ({
                    ...old!,
                    favoriteAccounts: user.favoriteAccounts.filter(favorite => favorite.id !== account.id)
                }));
            }
        }
        navigate(routes.accounts());
    }
}
