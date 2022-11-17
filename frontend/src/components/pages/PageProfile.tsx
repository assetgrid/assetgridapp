import * as React from "react";
import Card from "../common/Card";
import Hero from "../common/Hero";
import InputButton from "../input/InputButton";
import InputText from "../input/InputText";
import DeleteUserModal from "../user/DeleteUserModal";
import { forget } from "../../lib/Utils";
import { useTranslation } from "react-i18next";
import { useUser } from "../App";
import { useApi } from "../../lib/ApiClient";

export default function PageProfile (): React.ReactElement {
    const user = useUser();
    const api = useApi();
    const [isUpdating, setIsUpdating] = React.useState(false);
    const [showConfirmDeleteModal, setShowConfirmDeleteModal] = React.useState(false);
    const { t } = useTranslation();

    const [currentPassword, setCurrentPassword] = React.useState("");
    const [newPassword, setNewPassword] = React.useState("");
    const [repeatPassword, setRepeatPassword] = React.useState("");
    const [changePasswordErrors, setChangePasswordErrors] = React.useState<{ [key: string]: string[] }>({});
    const [passwordWasChanged, setPasswordWasChanged] = React.useState(false);

    return <>
        <Hero
            title={t("user.profile")}
            subtitle={user === undefined ? <>&hellip;</> : user.email} />
        <div className="p-3">
            <Card title={t("user.change_password")!} isNarrow={true}>
                { passwordWasChanged && <article className="message is-link">
                    <div className="message-body">
                        {t("user.password_was_changed")}
                    </div>
                </article>}
                <InputText label={t("user.current_password")!}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    password={true}
                    disabled={isUpdating}
                    errors={changePasswordErrors.OldPassword} />
                <InputText label={t("user.new_password")!}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    password={true}
                    disabled={isUpdating}
                    errors={changePasswordErrors.NewPassword !== undefined}/>
                <InputText label={t("user.repeat_password")!}
                    value={repeatPassword}
                    onChange={e => setRepeatPassword(e.target.value)}
                    password={true}
                    disabled={isUpdating}
                    errors={changePasswordErrors.NewPassword}/>
                <InputButton className="is-primary"
                    disabled={isUpdating || api === null}
                    onClick={forget(updatePassword)}>{t("user.change_password")}</InputButton>
            </Card>
            <Card title={t("user.delete_user")!} isNarrow={true}>
                <InputButton className="is-danger"
                    disabled={isUpdating}
                    onClick={() => setShowConfirmDeleteModal(true)}>{t("user.delete_user")}</InputButton>
            </Card>
        </div>
        <DeleteUserModal active={showConfirmDeleteModal} close={() => setShowConfirmDeleteModal(false)} />
    </>;

    async function updatePassword (): Promise<void> {
        setChangePasswordErrors({});
        setPasswordWasChanged(false);
        setIsUpdating(true);
        if (newPassword !== repeatPassword) {
            setChangePasswordErrors({ NewPassword: [t("user.passwords_do_not_match")] });
        } else if (api !== null) {
            const result = await api.User.changePassword(currentPassword, newPassword);
            if (result.status === 400) {
                setChangePasswordErrors(result.errors);
            } else if (result.status === 200) {
                setPasswordWasChanged(true);
                setCurrentPassword("");
                setNewPassword("");
                setRepeatPassword("");
            }
        }
        setIsUpdating(false);
    }
}
