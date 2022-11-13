using assetgrid_backend.models.Search;
using assetgrid_backend.models.ViewModels;
using assetgrid_backend.Models;
using System.ComponentModel.DataAnnotations;

namespace assetgrid_backend.Models.ViewModels
{
    public class ViewModifyTransaction : IValidatableObject
    {
        public int? SourceId { get; set; }
        public int? DestinationId { get; set; }
        public DateTime DateTime { get; set; }

        [MaxLength(250, ErrorMessage = "Description must be shorter than 250 characters.")]
        public string Description { get; set; } = null!;
        public List<string> Identifiers { get; set; } = null!;
        public long? Total { get; set; }
        public bool IsSplit { get; set; }
        public string? TotalString { get => Total?.ToString(); set => Total = value != null ? long.Parse(value) : null; }
        public List<ViewTransactionLine> Lines { get; set; } = null!;
        public List<ViewSetMetaField>? MetaData { get; set; } = null!;

        IEnumerable<ValidationResult> IValidatableObject.Validate(ValidationContext validationContext)
        {
            if (SourceId == null && DestinationId == null)
            {
                yield return new ValidationResult(
                    $"Either source or destination id must be set.",
                    new[] { nameof(SourceId), nameof(DestinationId) });
            }
            else if (SourceId == DestinationId)
            {
                yield return new ValidationResult(
                    $"Source and destination must be different.",
                    new[] { nameof(SourceId), nameof(DestinationId) });
            }

            if (Total != null && Total != Lines.Select(line => line.Amount).Sum())
            {
                yield return new ValidationResult(
                    $"Sum of line amounts does not match transaction total.",
                    new[] { nameof(Total), nameof(Lines) });
            }

            if (Lines.Count == 0)
            {
                yield return new ValidationResult(
                    $"A transaction must have at least one line",
                    new[] { nameof(Lines) });
            }

            if (! IsSplit && Lines.Count > 1)
            {
                yield return new ValidationResult(
                    $"Only split transactions can have more than one line",
                    new[] { nameof(Lines) });
            }

            if (Identifiers.Any(x => x.Length > 100))
            {
                yield return new ValidationResult(
                    $"Identifier must be shorter than 100 characters.",
                    new[] { nameof(Identifiers) });
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
        public List<string> Identifiers { get; set; } = null!;
        public long Total { get; set; }
        public bool IsSplit { get; set; }

        public string TotalString { get => Total.ToString(); set => Total = long.Parse(value); }
        public List<ViewTransactionLine> Lines { get; set; } = null!;

        public List<ViewMetaFieldValue>? MetaData { get; set; }
        public ViewTransaction()
        {

        }
    }

    public class ViewTransactionCreateManyResponse
    {
        public List<ViewTransaction> Succeeded { get; set; } = null!;
        public List<ViewModifyTransaction> Failed { get; set; } = null!;
        public List<ViewModifyTransaction> Duplicate { get; set; } = null!;
    }

    public class ViewTransactionLine
    {
        public long Amount { get; set; }
        public string AmountString { get => Amount.ToString(); set => Amount = long.Parse(value); }

        [MaxLength(250, ErrorMessage = "Description must be shorter than 250 characters.")]
        public string Description { get; set; } = null!;

        [MaxLength(50, ErrorMessage = "Category must be shorter than 50 characters.")]
        public string Category { get; set; } = null!;

        public ViewTransactionLine(long amount, string description, string category)
        {
            Amount = amount;
            Description = description;
            Category = category;
        }
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

        public SearchGroup? Query { get; set; }
    }
}
