using System.ComponentModel.DataAnnotations;

namespace assetgrid_backend.Models
{
    public class TransactionUniqueIdentifier
    {
        public int Id { get; set; }
        public int TransactionId { get; set; }
        public virtual Transaction Transaction { get; set; }

        [MaxLength(100)]
        public string Identifier { get; set; }

        public TransactionUniqueIdentifier(Transaction transaction, string identifier)
        {
            Transaction = transaction;
            TransactionId = transaction.Id;
            Identifier = identifier;
        }

        /// <summary>
        /// Constructor exclusively for entity framework
        /// </summary>
        private TransactionUniqueIdentifier()
        {
            Transaction = null!;
            Identifier = null!;
        }
    }
}
