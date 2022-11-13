using System.ComponentModel.DataAnnotations;

namespace assetgrid_backend.Models
{
    public class AccountUniqueIdentifier
    {
        public int Id { get; set; }
        public int AccountId { get; set; }
        public virtual Account Account { get; set; }

        [MaxLength(100)]
        public string Identifier { get; set; }

        public AccountUniqueIdentifier(Account account, string identifier)
        {
            Account = account;
            AccountId = account.Id;
            Identifier = identifier;
        }

        /// <summary>
        /// Private constructor exclusively for entity framework
        /// </summary>
        private AccountUniqueIdentifier()
        {
            Account = null!;
            Identifier = null!;
        }
    }
}
