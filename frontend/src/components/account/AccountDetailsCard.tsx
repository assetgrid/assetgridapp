import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as React from "react";
import { useNavigate } from "react-router";
import { useApi } from "../../lib/ApiClient";
import { routes } from "../../lib/routes";
import { forget, formatNumberWithUser } from "../../lib/Utils";
import { Account } from "../../models/account";
import Card from "../common/Card";
import InputButton from "../input/InputButton";
import InputCheckbox from "../input/InputCheckbox";
import InputIconButton from "../input/InputIconButton";
import InputText from "../input/InputText";
import YesNoDisplay from "../input/YesNoDisplay";
import * as solid from "@fortawesome/free-solid-svg-icons";
import * as regular from "@fortawesome/free-regular-svg-icons";
import InputTextMultiple from "../input/InputTextMultiple";
import { useTranslation } from "react-i18next";
import { useUser } from "../App";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HttpErrorResult } from "../../models/api";
import { User } from "../../models/user";

interface Props {
    account: Account
    isUpdatingFavorite: boolean
}

export default function AccountDetailsCard (props: Props): React.ReactElement {
    const [model, setEditingModel] = React.useState<Account | null>(null);
    const user = useUser();
    const navigate = useNavigate();
    const api = useApi();
    const queryClient = useQueryClient();
    const { mutate, error, isLoading: isMutating } = useMutation<Account, HttpErrorResult, Account, unknown>({
        mutationFn: async account => await api.Account.update(props.account.id, account),
        onSuccess: result => {
            queryClient.setQueryData<Account>(["account", props.account.id, "full"], _ => result);
            queryClient.setQueryData<Account>(["account", props.account.id], _ => result);
            forget(queryClient.invalidateQueries)(["account", "list"]);

            // Update favorite accounts
            if (result.favorite !== props.account.favorite) {
                if (result.favorite) {
                    queryClient.setQueryData<User>(["user"], old => ({
                        ...old!,
                        favoriteAccounts: [...old!.favoriteAccounts, result]
                    }));
                } else {
                    queryClient.setQueryData<User>(["user"], old => ({
                        ...old!,
                        favoriteAccounts: old!.favoriteAccounts.filter(fav => fav.id !== result.id)
                    }));
                }
            }
            setEditingModel(null);
        }
    });
    const errors = error?.status === 400 ? error.errors : {};
    const { t } = useTranslation();

    if (model === null) {
        return <Card
            style={{ flexGrow: 1 }}
            title={<>
                <span style={{ flexGrow: 1 }}>{t("account.account_details")}</span>
                {props.isUpdatingFavorite
                    ? <span className="icon">
                        <FontAwesomeIcon icon={solid.faSpinner} pulse />
                    </span>
                    : <span className="icon" onClick={() => mutate({ ...props.account, favorite: !props.account.favorite })} style={{ cursor: "pointer" }}>
                        {props.account.favorite ? <FontAwesomeIcon icon={solid.faStar} /> : <FontAwesomeIcon icon={regular.faStar} />}
                    </span>}
                <InputIconButton icon={solid.faPen} onClick={() => setEditingModel(props.account)} />
                <InputIconButton icon={regular.faTrashCan} onClick={() => {
                // Balance breaks navigation. Luckily we don't need it on the delete page
                    const { balance, ...accountWithoutBalance } = props.account;
                    navigate(routes.accountDelete(props.account.id.toString()), { state: { account: accountWithoutBalance, allowBack: true } });
                }} />
            </>} isNarrow={false}>
            <table className="table">
                <tbody>
                    <tr>
                        <td>{t("account.balance")}</td>
                        <td>{formatNumberWithUser(props.account.balance!, user)}</td>
                    </tr>
                    <tr>
                        <td>{t("account.name")}</td>
                        <td>{props.account.name}</td>
                    </tr>
                    <tr>
                        <td>{t("account.description")}</td>
                        <td style={{ maxWidth: "300px" }}>{props.account.description}</td>
                    </tr>
                    <tr>
                        <td>{t("account.identifiers")}</td>
                        <td>{props.account.identifiers.join(", ")}</td>
                    </tr>
                    <tr>
                        <td>{t("account.favorite")}</td>
                        <td>
                            <YesNoDisplay value={props.account.favorite} />
                        </td>
                    </tr>
                    <tr>
                        <td>{t("account.include_in_net_worth")}</td>
                        <td>
                            <YesNoDisplay value={props.account.includeInNetWorth} />
                        </td>
                    </tr>
                </tbody>
            </table>
        </Card>;
    } else {
        return <Card title={t("account.account_details")!} isNarrow={false}>
            <table className="table">
                <tbody>
                    <tr>
                        <td>{t("account.balance")}</td>
                        <td>{formatNumberWithUser(props.account.balance!, user)}</td>
                    </tr>
                    <tr>
                        <td>{t("account.name")}</td>
                        <td>
                            <InputText
                                value={model.name}
                                onChange={e => setEditingModel({ ...model, name: e.target.value })}
                                disabled={isMutating}
                                errors={errors.Name} />
                        </td>
                    </tr>
                    <tr>
                        <td>{t("account.description")}</td>
                        <td>
                            <InputText
                                value={model.description}
                                onChange={e => setEditingModel({ ...model, description: e.target.value })}
                                disabled={isMutating}
                                errors={errors.Description}/>
                        </td>
                    </tr>
                    <tr>
                        <td>{t("account.identifiers")}</td>
                        <td>
                            <InputTextMultiple
                                value={model.identifiers}
                                onChange={value => setEditingModel({ ...model, identifiers: value })}
                                disabled={isMutating}
                                errors={errors.Identifiers}/>
                        </td>
                    </tr>
                    <tr>
                        <td>{t("account.favorite")}</td>
                        <td>
                            <InputCheckbox
                                value={model.favorite}
                                onChange={e => setEditingModel({ ...model, favorite: e.target.checked })}
                                disabled={isMutating}
                                errors={errors.Favorite}/>
                        </td>
                    </tr>
                    <tr>
                        <td>{t("account.include_in_net_worth")}</td>
                        <td>
                            <InputCheckbox
                                value={model.includeInNetWorth}
                                onChange={e => setEditingModel({ ...model, includeInNetWorth: e.target.checked })}
                                disabled={isMutating}
                                errors={errors.IncludeInNetWorth}/>
                        </td>
                    </tr>
                </tbody>
            </table>
            <div className="buttons">
                <InputButton disabled={isMutating || api === null} className="is-primary" onClick={() => mutate(model)}>{t("common.save_changes")}</InputButton>
                <InputButton onClick={() => setEditingModel(null)}>{t("common.cancel")}</InputButton>
            </div>
        </Card>;
    }
}
