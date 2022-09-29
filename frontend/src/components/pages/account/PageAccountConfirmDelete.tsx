import * as React from "react";
import { useParams } from "react-router";
import { useNavigate } from "react-router";
import { Link } from "react-router-dom";
import { Api, useApi } from "../../../lib/ApiClient";
import { routes } from "../../../lib/routes";
import { Account } from "../../../models/account";
import { SearchGroup, SearchGroupType, SearchOperator } from "../../../models/search";
import { userContext } from "../../App";
import Card from "../../common/Card";
import Hero from "../../common/Hero";
import InputButton from "../../input/InputButton";
import TransactionList from "../../transaction/TransactionList";
import Page404 from "../Page404";
import PageError from "../PageError";

export default function PageAccountConfirmDelete() {
    const id = Number(useParams().id);
    const [isDeleting, setisDeleting] = React.useState(false);
    const [account, setAccount] = React.useState<Account | null | "fetching" | "error">(history.state.usr?.account ? history.state.usr.account : "fetching");
    const allowBack = history.state.usr?.allowBack === true;
    const navigate = useNavigate();
    const { user, updateFavoriteAccounts } = React.useContext(userContext);
    const api = useApi();

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
    }, [api, id])

    if (account === "fetching") {
        return <>Please wait</>;
    }
    if (account === null) {
        return <Page404 />;
    }
    if (account === "error" || account.id !== id) {
        return <PageError />;
    }

    /* Query returning transactions that reference this account and no other account*/
    const query: SearchGroup = {
        type: SearchGroupType.Or,
        children: [ {
            type: SearchGroupType.And,
            children: [
                {
                    type: SearchGroupType.Query,
                    query: {
                        column: "SourceAccountId",
                        value: null,
                        operator: SearchOperator.Equals,
                        not: false
                    }
                },
                {
                    type: SearchGroupType.Query,
                    query: {
                        column: "DestinationAccountId",
                        value: account.id,
                        operator: SearchOperator.Equals,
                        not: false
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
                        not: false
                    }
                },
                {
                    type: SearchGroupType.Query,
                    query: {
                        column: "DestinationAccountId",
                        value: null,
                        operator: SearchOperator.Equals,
                        not: false
                    }
                }
            ]
        }]
    };

    return <>
        <Hero title="Delete account" subtitle={<>#{account.id} {account.name}</>} isDanger={true} />
        <div className="p-3">
            <Card title="Delete account" isNarrow={false}>
                <p>Are you sure you want to delete this account? This action is irreversible!</p>
                <p>Transactions that do not have a source or destination after the deletion of this account will be deleted as well.</p>
                <div className="buttons mt-3">
                    <InputButton onClick={() => deleteAccount()} disabled={isDeleting || api === null} className="is-danger">Delete account</InputButton>
                    {allowBack
                        ? <button className="button" onClick={() => navigate(-1)}>Cancel</button>
                        : <Link to={routes.account(id.toString())} className="button" onClick={() => navigate(-1)}>Cancel</Link>}
                </div>
            </Card>
            <Card title="The following transactions will be deleted" isNarrow={false}>
                <TransactionList allowEditing={false} allowLinks={false} query={query} />
            </Card>
        </div>
    </>;

    async function deleteAccount() {
        if (account === null || account === "fetching" || account === "error" || api === null) return;

        setisDeleting(true);
        await api.Account.delete(account.id);
        if (account.favorite) {
            if (user !== "fetching") {
                updateFavoriteAccounts(user.favoriteAccounts.filter(favorite => favorite.id !== account.id));
            }
        }
        navigate(routes.accounts());
    }
}