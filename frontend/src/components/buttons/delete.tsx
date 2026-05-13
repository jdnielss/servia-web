import { Button } from '@mantine/core';
import { MdDelete } from '@react-icons/all-files/md/MdDelete';

export default function DeleteButton(props: any) {
  return (
    <Button color="red" size="xs" aria-label={props.title} px={8} {...props}>
      <MdDelete size={20} />
    </Button>
  );
}
