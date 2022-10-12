﻿namespace assetgrid_backend.models
{
    public class UserAccount
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public virtual User User { get; set; } = null!;
        public int AccountId { get; set; }
        public virtual Account Account { get; set; } = null!;
        public UserAccountPermissions Permissions { get; set; }
        public bool Favorite { get; set; }
        public bool IncludeInNetWorth { get; set; }
    }

    public enum UserAccountPermissions
    {
        /// <summary>
        /// User can see transactions on this account, but can only create transactions between this account and accounts they own.
        /// The user cannot create new transfers to this account
        /// </summary>
        Read,

        /// <summary>
        /// User can modify all transactions on the account, but cannot change account properties or delete it
        /// </summary>
        ModifyTransactions,

        /// <summary>
        /// User has full access of the account and can change any property or delete it. They can also share the account with other users.
        /// </summary>
        All,
    }
}
