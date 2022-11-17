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

interface Props {
    account: Account
    updatingFavorite: boolean
    toggleFavorite: () => void
    onChange: (account: Account) => void
    updateAccountFavoriteInPreferences: (account: Account, favorite: boolean) => void
}

export default function AccountDetailsCard (props: Props): React.ReactElement {
    const [editingModel, setEditingModel] = React.useState<Account | null>(null);
    const [isUpdating, setIsUpdating] = React.useState(false);
    const user = useUser();
    const [errors, setErrors] = React.useState<{ [key: string]: string[] }>({});
    const navigate = useNavigate();
    const api = useApi();
    const { t } = useTranslation();

    if (editingModel === null) {
        return <Card
            style={{ flexGrow: 1 }}
            title={<>
                <span style={{ flexGrow: 1 }}>{t("account.account_details")}</span>
                {props.updatingFavorite
                    ? <span className="icon">
                        <FontAwesomeIcon icon={solid.faSpinner} pulse />
                    </span>
                    : <span className="icon" onClick={() => props.toggleFavorite()} style={{ cursor: "pointer" }}>
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
                                value={editingModel.name}
                                onChange={e => setEditingModel({ ...editingModel, name: e.target.value })}
                                disabled={isUpdating}
                                errors={errors.Name} />
                        </td>
                    </tr>
                    <tr>
                        <td>{t("account.description")}</td>
                        <td>
                            <InputText
                                value={editingModel.description}
                                onChange={e => setEditingModel({ ...editingModel, description: e.target.value })}
                                disabled={isUpdating}
                                errors={errors.Description}/>
                        </td>
                    </tr>
                    <tr>
                        <td>{t("account.identifiers")}</td>
                        <td>
                            <InputTextMultiple
                                value={editingModel.identifiers}
                                onChange={value => setEditingModel({ ...editingModel, identifiers: value })}
                                disabled={isUpdating}
                                errors={errors.Identifiers}/>
                        </td>
                    </tr>
                    <tr>
                        <td>{t("account.favorite")}</td>
                        <td>
                            <InputCheckbox
                                value={editingModel.favorite}
                                onChange={e => setEditingModel({ ...editingModel, favorite: e.target.checked })}
                                disabled={isUpdating}
                                errors={errors.Favorite}/>
                        </td>
                    </tr>
                    <tr>
                        <td>{t("account.include_in_net_worth")}</td>
                        <td>
                            <InputCheckbox
                                value={editingModel.includeInNetWorth}
                                onChange={e => setEditingModel({ ...editingModel, includeInNetWorth: e.target.checked })}
                                disabled={isUpdating}
                                errors={errors.IncludeInNetWorth}/>
                        </td>
                    </tr>
                </tbody>
            </table>
            <div className="buttons">
                <InputButton disabled={isUpdating || api === null} className="is-primary" onClick={forget(saveChanges)}>{t("common.save_changes")}</InputButton>
                <InputButton onClick={() => setEditingModel(null)}>{t("common.cancel")}</InputButton>
            </div>
        </Card>;
    }

    async function saveChanges (): Promise<void> {
        if (editingModel === null || api === null) return;

        setIsUpdating(true);
        setErrors({});
        const { balance, ...updateModel } = editingModel;
        const result = await api.Account.update(props.account.id, updateModel);
        setIsUpdating(false);

        if (result.status === 200) {
            result.data.balance = props.account.balance;
            setEditingModel(null);
            if (editingModel.favorite !== props.account.favorite) {
                props.updateAccountFavoriteInPreferences(props.account, editingModel.favorite);
            }
            props.onChange(result.data);
        } else if (result.status === 400) {
            setErrors(result.errors);
        }
    }
}
