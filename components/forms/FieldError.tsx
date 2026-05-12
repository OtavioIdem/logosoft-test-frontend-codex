export const FieldError = ({ id, message }: { id?: string; message?: string }) => {
    if (!message) return null;
    return (
        <small id={id} className="p-error block mt-1">
            {message}
        </small>
    );
};
