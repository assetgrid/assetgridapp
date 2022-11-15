using assetgrid_backend.models.MetaFields;
using assetgrid_backend.Models;

namespace assetgrid_backend.Services
{
    public class AttachmentService
    {
        private readonly string _uploadDirectory;
        private readonly AssetgridDbContext _context;
        public AttachmentService(IConfiguration configuration, AssetgridDbContext context)
        {
            var uploadDirectory = configuration.GetValue<string>("UploadDirectory");
            if (uploadDirectory == null)
            {
                throw new ArgumentNullException(nameof(uploadDirectory));
            }

            _uploadDirectory = uploadDirectory;
            _context = context;
        }

        public async Task<Attachment> CreateAttachment (IFormFile file)
        {
            var fileName = file.FileName;
            if (fileName.Length > 250)
            {
                var extension = Path.GetExtension(fileName);
                if (extension.Length > 249)
                {
                    throw new Exception();
                }
                fileName = file.FileName.Substring(0, 250 - extension.Length);
            }

            var attachment = new Attachment
            {
                FileName = fileName,
                FileSize = file.Length
            };
            _context.Attachments.Add(attachment);
            await _context.SaveChangesAsync();

            if (! Directory.Exists(_uploadDirectory))
            {
                Directory.CreateDirectory(_uploadDirectory);
            }
            var uploadPath = Path.Combine(_uploadDirectory, "./", attachment.Id.ToString());
            using (var stream = File.OpenWrite(uploadPath))
            {
                await file.CopyToAsync(stream);
            }

            return attachment;
        }

        public async Task<Stream> GetAttachment (Attachment attachment)
        {
            var filePath = Path.Combine(_uploadDirectory, "./", attachment.Id.ToString());
            if (! File.Exists(filePath))
            {
                _context.RemoveRange(_context.TransactionMetaAttachment.Where(x => x.ValueId == attachment.Id));
                _context.Remove(attachment);
                await _context.SaveChangesAsync();

                throw new Exception("Missing file");
            }

            return File.OpenRead(filePath);
        }

        public void DeleteAttachment (Attachment attachment)
        {
            var filePath = Path.Combine(_uploadDirectory, "./", attachment.Id.ToString());
            if (File.Exists(filePath))
            {
                File.Delete(filePath);
            }
        }
    }
}
