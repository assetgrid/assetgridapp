import * as React from "react";
import Card from "../common/Card";
import Hero from "../common/Hero";
import Image404 from "../../assets/404.svg";
import { userContext } from "../App";
import InputButton from "../input/InputButton";
import InputText from "../input/InputText";
import Modal from "../common/Modal";
import DeleteUserModal from "../user/DeleteUserModal";
import { useApi } from "../../lib/ApiClient";

export default function () {
    const { user } = React.useContext(userContext);
    const api = useApi();
    const [isUpdating, setIsUpdating] = React.useState(false);
    const [showConfirmDeleteModal, setShowConfirmDeleteModal] = React.useState(false);

    const [currentPassword, setCurrentPassword] = React.useState("");
    const [newPassword, setNewPassword] = React.useState("");
    const [repeatPassword, setRepeatPassword] = React.useState("");
    const [changePasswordErrors, setChangePasswordErrors] = React.useState<{ [key: string]: string[] }>({});
    const [passwordWasChanged, setPasswordWasChanged] = React.useState(false);

    return <>
        <Hero
            title="Profile"
            subtitle={user === "fetching" ? <>&hellip;</> : user.email} />
        <div className="p-3">
            <Card title="Change password" isNarrow={true}>
                { passwordWasChanged && <article className="message is-link">
                    <div className="message-body">
                        Your password has been changed.
                    </div>
                </article>}
                <InputText label="Current password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    password={true}
                    disabled={isUpdating}
                    errors={changePasswordErrors["OldPassword"]} />
                <InputText label="New password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    password={true}
                    disabled={isUpdating}
                    errors={changePasswordErrors["NewPassword"] !== undefined}/>
                <InputText label="Repeat password"
                    value={repeatPassword}
                    onChange={e => setRepeatPassword(e.target.value)}
                    password={true}
                    disabled={isUpdating}
                    errors={changePasswordErrors["NewPassword"]}/>
                <InputButton className="is-primary"
                    disabled={isUpdating || api === null}
                    onClick={updatePassword}>Change password</InputButton>
            </Card>
            <Card title="Delete user" isNarrow={true}>
                <InputButton className="is-danger"
                    disabled={isUpdating}
                    onClick={() => setShowConfirmDeleteModal(true)}>Delete user</InputButton>
            </Card>
        </div>
        <DeleteUserModal active={showConfirmDeleteModal} close={() => setShowConfirmDeleteModal(false)} />
    </>;

    async function updatePassword() {
        setChangePasswordErrors({});
        setPasswordWasChanged(false);
        setIsUpdating(true);
        if (newPassword !== repeatPassword) {
            setChangePasswordErrors({ NewPassword: ["Passwords do not match"] });
        } else if(api !== null) {
            let result = await api.User.changePassword(currentPassword, newPassword);
            if (result.status === 400) {
                setChangePasswordErrors(result.errors);
            } else if(result.status === 200) {
                setPasswordWasChanged(true);
                setCurrentPassword("");
                setNewPassword("");
                setRepeatPassword("");
            }
        }
        setIsUpdating(false);
    }
}