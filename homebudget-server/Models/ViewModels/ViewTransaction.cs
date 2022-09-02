using System.ComponentModel.DataAnnotations;

namespace homebudget_server.Models.ViewModels
{
    public class ViewCreateTransaction : IValidatableObject
    {
        public int? SourceId { get; set; }
        public int? DestinationId { get; set; }
        public DateTime DateTime { get; set; }
        public string Description { get; set; } = null!;
        public string? Identifier { get; set; }
        public string Category { get; set; } = null!;
        public List<ViewTransactionLine> Lines { get; set; } = null!;

        IEnumerable<ValidationResult> IValidatableObject.Validate(ValidationContext validationContext)
        {
            if (SourceId == null && DestinationId == null)
            {
                yield return new ValidationResult(
                    $"Either source or destination id must be set.",
                    new[] { nameof(SourceId), nameof(DestinationId) });
            }
            if (SourceId == DestinationId)
            {
                yield return new ValidationResult(
                    $"Source and destination must be different.",
                    new[] { nameof(SourceId), nameof(DestinationId) });
            }
        }
    }

    public class ViewUpdateTransaction : IValidatableObject
    {
        public int Id { get; set; }
        public int? SourceId { get; set; }
        public int? DestinationId { get; set; }
        public DateTime? DateTime { get; set; }
        public string? Description { get; set; }

        IEnumerable<ValidationResult> IValidatableObject.Validate(ValidationContext validationContext)
        {
            if (SourceId == null && DestinationId == null)
            {
                yield return new ValidationResult(
                    $"Either source or destination id must be set.",
                    new[] { nameof(SourceId), nameof(DestinationId) });
            }
            if (SourceId == DestinationId)
            {
                yield return new ValidationResult(
                    $"Source and destination must be different.",
                    new[] { nameof(SourceId), nameof(DestinationId) });
            }
        }
    }
    public class ViewTransaction
    {
        public int Id { get; set; }
        public ViewAccount? Source { get; set; }
        public ViewAccount? Destination { get; set; }
        public DateTime DateTime { get; set; }
        public string Description { get; set; } = null!;
        public string? Identifier { get; set; }
        public long Total { get; set; }

        public string Category { get; set; } = null!;
        public string TotalString { get => Total.ToString(); set => Total = long.Parse(value); }
        public List<ViewTransactionLine> Lines { get; set; } = null!;
    }

    public class ViewTransactionCreateManyResponse
    {
        public List<ViewCreateTransaction> Succeeded { get; set; } = null!;
        public List<ViewCreateTransaction> Failed { get; set; } = null!;
        public List<ViewCreateTransaction> Duplicate { get; set; } = null!;
    }

    public class ViewTransactionLine
    {
        public long Amount { get; set; }
        public string AmountString { get => Amount.ToString(); set => Amount = long.Parse(value); }
        public string Description { get; set; } = null!;
    }

    public class ViewTransactionList : ViewSearchResponse<ViewTransaction>
    {
        public long? Total { get; set; }
        public string? TotalString { get => Total.ToString(); set => Total = value != null ? long.Parse(value) : null; }
    }

    public class ViewTransactionListRequest
    {
        public int? AccountId { get; set; }
        public int From { get; set; }
        public int To { get; set; }
        public bool Descending { get; set; }

        public ViewSearchGroup? Query { get; set; }
    }
}
