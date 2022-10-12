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
        public string Description { get; set; } = null!;
        public long Total { get; set; }

        [MaxLength(50)]
        public string Category { get; set; } = null!;

        public virtual List<TransactionLine> TransactionLines { get; set; } = null!;
        public virtual List<TransactionUniqueIdentifier> Identifiers { get; set; } = null!;

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

            if (TransactionLines.Count > 0 && Total != TransactionLines.Select(line => line.Amount).Sum())
            {
                yield return new ValidationResult(
                    $"Sum of line amounts does not match transaction total",
                    new[] { nameof(Total), nameof(TransactionLines) });
            }
        }
    }
}
