import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as React from "react";
import { useNavigate } from "react-router";
import { Api } from "../../lib/ApiClient";
import { routes } from "../../lib/routes";
import { formatNumberWithPrefs } from "../../lib/Utils";
import { Account } from "../../models/account";
import { preferencesContext } from "../App";
import Card from "../common/Card";
import InputButton from "../input/InputButton";
import InputCheckbox from "../input/InputCheckbox";
import InputIconButton from "../input/InputIconButton";
import InputText from "../input/InputText";
import YesNoDisplay from "../input/YesNoDisplay";
import * as solid from "@fortawesome/free-solid-svg-icons"
import * as regular from "@fortawesome/free-regular-svg-icons"

interface Props {
    account: Account,
    updatingFavorite: boolean,
    toggleFavorite: () => void,
    onChange: (account: Account) => void;
    updateAccountFavoriteInPreferences: (account: Account, favorite: boolean) => void
}

export default function AccountDetailsCard(props: Props): React.ReactElement {
    
    const [editingModel, setEditingModel] = React.useState<Account | null>(null);
    const [isUpdating, setIsUpdating] = React.useState(false);
    const { preferences } = React.useContext(preferencesContext);
    const navigate = useNavigate();

    if (editingModel === null) {
        return <Card
            style={{ flexGrow: 1 }}
            title={<>
            <span style={{ flexGrow: 1 }}>Account details</span>
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
                navigate(routes.accountDelete(props.account.id.toString()), { state: { account: accountWithoutBalance, allowBack: true } })
            }} />
        </>} isNarrow={false}>
            <table className="table">
                <tbody>
                    <tr>
                        <td>Balance</td>
                        <td>{formatNumberWithPrefs(props.account.balance!, preferences)}</td>
                    </tr>
                    <tr>
                        <td>Name</td>
                        <td>{props.account.name}</td>
                    </tr>
                    <tr>
                        <td>Description</td>
                        <td style={{maxWidth: "300px"}}>{props.account.description}</td>
                    </tr>
                    <tr>
                        <td>Account Number</td>
                        <td>{props.account.accountNumber}</td>
                    </tr>
                    <tr>
                        <td>Favorite</td>
                        <td>
                            <YesNoDisplay value={props.account.favorite} />
                        </td>
                    </tr>
                    <tr>
                        <td>Include in net worth</td>
                        <td>
                            <YesNoDisplay value={props.account.includeInNetWorth} />
                        </td>
                    </tr>
                </tbody>
            </table>
        </Card>
    } else {
        return <Card title="Account details" isNarrow={false}>
            <table className="table">
                <tbody>
                    <tr>
                        <td>Balance</td>
                        <td>{formatNumberWithPrefs(props.account.balance!, preferences)}</td>
                    </tr>
                    <tr>
                        <td>Name</td>
                        <td>
                            <InputText
                                value={editingModel.name}
                                onChange={e => setEditingModel({ ...editingModel, name: e.target.value })}
                                disabled={isUpdating} />
                        </td>
                    </tr>
                    <tr>
                        <td>Description</td>
                        <td>
                            <InputText
                                value={editingModel.description}
                                onChange={e => setEditingModel({ ...editingModel, description: e.target.value })}
                                disabled={isUpdating} />
                        </td>
                    </tr>
                    <tr>
                        <td>Account number</td>
                        <td>
                            <InputText
                                value={editingModel.accountNumber}
                                onChange={e => setEditingModel({ ...editingModel, accountNumber: e.target.value })}
                                disabled={isUpdating} />
                        </td>
                    </tr>
                    <tr>
                        <td>Favorite</td>
                        <td>
                            <InputCheckbox
                                value={editingModel.favorite}
                                onChange={e => setEditingModel({ ...editingModel, favorite: e.target.checked })}
                                disabled={isUpdating} />  
                        </td>
                    </tr>
                    <tr>
                        <td>Include in net worth</td>
                        <td>
                            <InputCheckbox
                                value={editingModel.includeInNetWorth}
                                onChange={e => setEditingModel({ ...editingModel, includeInNetWorth: e.target.checked })}
                                disabled={isUpdating} />
                        </td>
                    </tr>
                </tbody>
            </table>
            <div className="buttons">
                <InputButton disabled={isUpdating} className="is-primary" onClick={saveChanges}>Save changes</InputButton>
                <InputButton onClick={() => setEditingModel(null)}>Cancel</InputButton>
            </div>
        </Card>
    }

    async function saveChanges() {
        if (editingModel === null) return;

        setIsUpdating(true);
        const { balance, ...updateModel } = editingModel;
        const result = await Api.Account.update(props.account.id, updateModel);
        result.balance = props.account.balance;
        setEditingModel(null);
        setIsUpdating(false);
        if (editingModel.favorite !== props.account.favorite) {
            props.updateAccountFavoriteInPreferences(props.account, editingModel.favorite);
        }
        props.onChange(result);
    }
}