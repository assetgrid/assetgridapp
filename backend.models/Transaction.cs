using assetgrid_backend.models.MetaFields;
using System.ComponentModel.DataAnnotations;
using System.Linq;

namespace assetgrid_backend.Models
{
    public class Transaction : IValidatableObject
    {
        public int Id { get; set; }
        public int? SourceAccountId { get; set; }
        public virtual Account? SourceAccount { get; set; }
        public int? DestinationAccountId { get; set; }
        public virtual Account? DestinationAccount { get; set; }
        public DateTime DateTime { get; set; }

        [MaxLength(250)]
        public required string Description { get; set; }
        public long Total { get; set; }
        public bool IsSplit { get; set; }
        public required virtual List<TransactionLine> TransactionLines { get; set; }
        public required virtual List<TransactionUniqueIdentifier> Identifiers { get; set; }

        #region Meta data values

        public virtual List<MetaTextLine<Transaction>>? MetaTextLineValues { get; set; }
        public virtual List<MetaTextLong<Transaction>>? MetaTextLongValues { get; set; }
        public virtual List<MetaNumber<Transaction>>? MetaNumberValues { get; set; }
        public virtual List<MetaTransaction<Transaction>>? MetaTransactionValues { get; set; }
        public virtual List<MetaAccount<Transaction>>? MetaAccountValues { get; set; }
        public virtual List<MetaAttachment<Transaction>>? MetaAttachmentValues { get; set; }
        public virtual List<MetaBoolean<Transaction>>? MetaBooleanValues { get; set; }

        #endregion

        IEnumerable<ValidationResult> IValidatableObject.Validate(ValidationContext validationContext)
        {
            if (SourceAccountId == null && DestinationAccountId == null)
            {
                yield return new ValidationResult(
                    $"Either source or destination id must be set.",
                    new[] { nameof(SourceAccountId), nameof(DestinationAccountId) });
            }
            else if (SourceAccountId == DestinationAccountId)
            {
                yield return new ValidationResult(
                    $"Source and destination must be different.",
                    new[] { nameof(SourceAccountId), nameof(DestinationAccountId) });
            }

            if (Total != TransactionLines.Select(line => line.Amount).Sum())
            {
                yield return new ValidationResult(
                    $"Sum of line amounts does not match transaction total",
                    new[] { nameof(Total), nameof(TransactionLines) });
            }

            if (TransactionLines.Count == 0)
            {
                yield return new ValidationResult(
                    $"A transaction must have at least one line",
                    new[] { nameof(TransactionLines) });
            }

            if (! IsSplit && TransactionLines.Count > 1)
            {
                yield return new ValidationResult(
                    $"Only split transactions can have more than one line",
                    new[] { nameof(TransactionLines) });
            }
        }
    }
}
